import { sql } from "kysely";
import type { Cache } from "../cache/cache.js";
import type { AppConfig } from "../config.js";
import type { Db } from "../db/client.js";
import { countVote, rebuildIfMissing, type LiveCounts } from "../polls/counters.js";
import { effectiveVoterLimit, validateVoteChoicesAndState, VoteError } from "../polls/service.js";
import type { PollVisibility } from "../polls/store.js";
import { readProjection, type PollProjection } from "../polls/versions.js";
import type { RosterCache } from "./rosterCache.js";
import { VOTE_STREAM } from "./queue.js";
import { maskIp } from "../auth/maskIp.js";

const VOTED_TTL_MS = 24 * 3_600_000;
const IP_WINDOW_MS = 60_000;
const QUEUE_LAG_KEY = "queue:lag";

export const VOTED_KEY = (sessionId: string) => `voted:${sessionId}`;
export const LAST_VOTE_KEY = (pid: string, email: string) => `lastvote:${pid}:${email}`;
export const IP_VOTES_KEY = (ip: string) => `votes-ip:${ip}`;
const VOTED_MARKER = "_";

export interface VoteRequest {
  sessionId: string;
  /** The voter's account id; the creator of an Invitation Only poll votes without an invitation. */
  userId?: string;
  email: string;
  userName: string;
  ip: string;
  pid: string;
  choiceIds: string[];
  now?: Date;
}

export interface VoteResponse {
  status: "recorded" | "queued";
  voteCount: number;
  choiceCounts: Record<string, number>;
  countsVersion: number;
  myChoiceIds: string[];
}

export interface VotePathDeps {
  db: Db;
  cache: Cache;
  config: Pick<AppConfig, "maxVotesPerIpPerMinute" | "voteQueueLagNoticeMs" | "privateVoterLimitDefault">;
  rosters: RosterCache;
  abuse: { ipVoteCap: number };
}

async function enforceIpCap(deps: VotePathDeps, ip: string): Promise<void> {
  const count = await deps.cache.incr(IP_VOTES_KEY(ip));
  if (count === 1) await deps.cache.expire(IP_VOTES_KEY(ip), IP_WINDOW_MS);
  if (count <= deps.config.maxVotesPerIpPerMinute) return;
  deps.abuse.ipVoteCap += 1;
  if (count === deps.config.maxVotesPerIpPerMinute + 1) {
    console.log(`[abuse] address ${maskIp(ip)} exceeded ${deps.config.maxVotesPerIpPerMinute} votes in a minute`);
  }
  throw new VoteError(429, "Too many votes from your address. Please try again later.", "ip-vote-cap");
}

async function hasVotedBefore(deps: VotePathDeps, sessionId: string, email: string, pid: string): Promise<boolean> {
  const key = VOTED_KEY(sessionId);
  if (await deps.cache.sismember(key, VOTED_MARKER)) {
    await deps.cache.expire(key, VOTED_TTL_MS);
    return deps.cache.sismember(key, pid);
  }
  const rows = await deps.db
    .selectFrom("votes")
    .select("poll_id")
    .where("email", "=", email)
    .where((eb) => eb("choice_ids", "!=", eb.val([])))
    .execute();
  await deps.cache.sadd(key, VOTED_MARKER, ...rows.map((r) => r.poll_id));
  await deps.cache.expire(key, VOTED_TTL_MS);
  return rows.some((r) => r.poll_id === pid);
}

async function previousChoices(deps: VotePathDeps, pid: string, email: string): Promise<string[]> {
  const cached = await deps.cache.get(LAST_VOTE_KEY(pid, email));
  if (cached) return JSON.parse(cached) as string[];
  const row = await deps.db
    .selectFrom("votes")
    .select("choice_ids")
    .where("poll_id", "=", pid)
    .where("email", "=", email)
    .executeTakeFirst();
  return row?.choice_ids ?? [];
}

/** Votes on an Invitation Only poll from its creator while they hold no invitation: 0 or 1. */
async function uninvitedCreatorVotes(deps: VotePathDeps, pid: string): Promise<number> {
  const row = await deps.db
    .selectFrom("votes")
    .innerJoin("polls", "polls.id", "votes.poll_id")
    .innerJoin("user", (join) => join.onRef("user.id", "=", "polls.created_by_id").onRef("user.email", "=", "votes.email"))
    .select((eb) => eb.fn.countAll<string>().as("n"))
    .where("votes.poll_id", "=", pid)
    .where(sql<boolean>`cardinality(votes.choice_ids) > 0`)
    .where(sql<boolean>`not exists (select 1 from poll_invitations where poll_invitations.poll_id = votes.poll_id and poll_invitations.email = votes.email)`)
    .executeTakeFirst();
  return Number(row?.n ?? 0);
}

async function assertEligible(
  deps: VotePathDeps,
  projection: PollProjection,
  email: string,
  userId: string,
  isNewVoter: boolean
): Promise<void> {
  if (await deps.rosters.isBanned(projection.pid, email)) {
    throw new VoteError(403, "You have been removed from this poll and cannot vote in it.");
  }
  const invitationOnly = projection.pollVisibility === "Private Poll" && projection.pollSharingMode === "Invitation Only";
  if (!isNewVoter && !invitationOnly) return;
  if (projection.pollVisibility === "Public Poll") return;
  const pollRow = () =>
    deps.db
      .selectFrom("polls")
      .select(["voter_count_limit", "created_by_id"])
      .where("id", "=", projection.pid)
      .executeTakeFirst();
  if (invitationOnly && !(await deps.rosters.isInvited(projection.pid, email))) {
    // The creator always votes on their own poll, and outside its voter limit.
    if (userId !== "" && (await pollRow())?.created_by_id === userId) return;
    throw new VoteError(403, "You are not invited to this poll.");
  }
  if (!isNewVoter) return;
  const row = await pollRow();
  const limit = effectiveVoterLimit(
    { pollVisibility: projection.pollVisibility as PollVisibility, voterCountLimit: row?.voter_count_limit ?? null },
    deps.config
  );
  if (limit === null) return;
  const counts = await rebuildIfMissing(deps, projection.pid);
  const voters = (counts?.voteCount ?? 0) - (invitationOnly ? await uninvitedCreatorVotes(deps, projection.pid) : 0);
  if (voters >= limit) {
    throw new VoteError(403, "This poll has reached its maximum number of votes.");
  }
}

/** Validate from the cache, count, enqueue, answer — one path for every vote. */
export async function castVote(deps: VotePathDeps, vote: VoteRequest): Promise<VoteResponse> {
  const now = vote.now ?? new Date();
  await enforceIpCap(deps, vote.ip);
  const projection = await readProjection(deps.cache, deps.db, vote.pid);
  if (!projection) throw new VoteError(404, "Not found");
  const knownChoices = new Set(projection.choices.map((c) => c.id));
  const choiceIds = [...new Set(vote.choiceIds)];
  if (choiceIds.some((id) => !knownChoices.has(id))) {
    throw new VoteError(400, "Select at least one choice.");
  }

  const votedBefore = await hasVotedBefore(deps, vote.sessionId, vote.email, vote.pid);
  await assertEligible(deps, projection, vote.email, vote.userId ?? "", !votedBefore);
  validateVoteChoicesAndState(
    { pollState: projection.pollState as never, choiceMode: projection.choiceMode as never, voteMutability: projection.voteMutability as never },
    choiceIds,
    votedBefore
  );

  const previous = votedBefore ? await previousChoices(deps, vote.pid, vote.email) : [];
  await rebuildIfMissing(deps, vote.pid);
  const counts: LiveCounts = await countVote(deps.cache, vote.pid, choiceIds, previous, !votedBefore, now);
  await deps.cache.xadd(VOTE_STREAM, {
    pid: vote.pid,
    email: vote.email,
    userName: vote.userName,
    choiceIds: JSON.stringify(choiceIds),
    votedAt: now.toISOString(),
    voteMutability: projection.voteMutability
  });
  await deps.cache.sadd(VOTED_KEY(vote.sessionId), VOTED_MARKER, vote.pid);
  await deps.cache.set(LAST_VOTE_KEY(vote.pid, vote.email), JSON.stringify(choiceIds), VOTED_TTL_MS);

  const lagMs = Number((await deps.cache.get(QUEUE_LAG_KEY)) ?? 0);
  return {
    status: lagMs >= deps.config.voteQueueLagNoticeMs ? "queued" : "recorded",
    voteCount: counts.voteCount,
    choiceCounts: counts.choiceCounts,
    countsVersion: counts.countsVersion,
    myChoiceIds: choiceIds
  };
}

export const QUEUE_LAG = QUEUE_LAG_KEY;
