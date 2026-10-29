import { sql } from "kysely";
import type { Poll, PollState, VoteHistoryEntry } from "../../src/polls/store.js";
import { findPoll, insertPoll, insertVoteHistory, updatePoll, type StoreDeps } from "../../src/polls/store.js";
import { projectPoll, type PollProjection } from "../../src/polls/versions.js";

export function makePoll(overrides: Partial<Poll> = {}): Poll {
  return {
    _id: `poll-${Math.random().toString(36).slice(2)}`,
    title: "Test Poll",
    subtitle: "",
    keywords: "",
    choiceMode: "Single-Choice Poll",
    voteMutability: "Final-Vote Poll",
    pollVisibility: "Public Poll",
    pollSharingMode: "Anyone With The Link",
    voteAnonymity: "Yes",
    voterCountLimit: 500,
    // 011: OPEN is the fixture default — most suites exercise a votable poll.
    pollState: "OPEN",
    createdAt: new Date(),
    startAt: null,
    endAt: null,
    choices: [
      { id: "c1", label: "Choice 1", position: 0 },
      { id: "c2", label: "Choice 2", position: 1 }
    ],
    invitedVoterList: [],
    bannedVoterList: [],
    currentVotes: [],
    pollStateBeforeEditUpdate: null,
    pollEditUpdateHeartbeatTimestamp: null,
    pollEditUpdateClientGUID: null,
    pollApprovalTimestamp: null,
    pollAcceptabilityScreeningAttempts: 0,
    pollRejectionReason: null,
    timeZone: null,
    ...overrides
  };
}

/** Seeds and reads polls the way the suites describe them: whole aggregates by id. */
export function polls(deps: StoreDeps) {
  return {
    insertOne: (poll: Poll) => insertPoll(deps, poll),
    insertMany: async (list: Poll[]) => {
      for (const poll of list) await insertPoll(deps, poll);
    },
    findOne: (filter: { _id: string }) => findPoll(deps.db, filter._id),
    updateOne: async (filter: { _id: string }, update: { $set: Partial<Poll> }) => {
      await updatePoll(deps, filter._id, update.$set);
    },
    deleteMany: async (_filter: Record<string, never>) => {
      await sql`truncate table line_graph_tally, line_graph_selection, vote_history, votes, poll_invitations, invitation_history, invitation_emails, poll_bans, bookmarks, user_polls, search_outbox, polls`.execute(
        deps.db
      );
      for (const key of [...(await deps.cache.scan("tabs:*")), ...(await deps.cache.scan("poll:*"))]) await deps.cache.del(key);
    },
    countDocuments: async (filter: { pollState?: PollState } = {}) => {
      let query = deps.db.selectFrom("polls").select((eb) => eb.fn.countAll<string>().as("n"));
      if (filter.pollState) query = query.where("poll_state", "=", filter.pollState);
      return Number((await query.executeTakeFirstOrThrow()).n);
    }
  };
}

export function voteHistory(deps: StoreDeps) {
  return {
    insertOne: (entry: VoteHistoryEntry) => insertVoteHistory(deps.db, entry),
    insertMany: async (list: VoteHistoryEntry[]) => {
      for (const entry of list) await insertVoteHistory(deps.db, entry);
    },
    deleteMany: async (_filter: Record<string, never>) => {
      await deps.db.deleteFrom("vote_history").execute();
      await deps.db.deleteFrom("line_graph_tally").execute();
      await deps.db.deleteFrom("line_graph_selection").execute();
    },
    countDocuments: async (filter: { pid: string }) => {
      const row = await deps.db
        .selectFrom("vote_history")
        .select((eb) => eb.fn.countAll<string>().as("n"))
        .where("poll_id", "=", filter.pid)
        .executeTakeFirstOrThrow();
      return Number(row.n);
    }
  };
}

/** The public scope of the home page: every poll the search and TRENDING surfaces may list. */
export async function publicListing(deps: StoreDeps): Promise<string[]> {
  const rows = await deps.db.selectFrom("polls").select("id").where("home_listable", "=", true).execute();
  return rows.map((r) => r.id);
}

/** A poll's public card, or null when the home scope withholds it. */
export async function publicDetail(deps: StoreDeps, pid: string): Promise<PollProjection | null> {
  const row = await deps.db.selectFrom("polls").selectAll().where("id", "=", pid).executeTakeFirst();
  if (!row || !row.home_listable) return null;
  return projectPoll(row);
}
