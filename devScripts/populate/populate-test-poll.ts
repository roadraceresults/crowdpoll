// Creates or refreshes one test poll from a JSON file and votes on it from test accounts; usage in devScripts/populate/README-populate-poll-and-seed-poll.md.
import { randomUUID } from "node:crypto";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { sql } from "kysely";
import { loadConfig, type AppConfig } from "../../src/config.js";
import { createCache, type Cache } from "../../src/cache/cache.js";
import { createDb, closeDb, type Db } from "../../src/db/client.js";
import { maskAddress } from "../../src/email/mailer.js";
import { CHOICE_LABEL_MAX, createDefaultPoll, SUBTITLE_MAX, TITLE_MAX } from "../../src/polls/service.js";
import { findPollRow, insertPoll, updatePoll, upsertUserPolls, type Choice } from "../../src/polls/store.js";
import { reconcile } from "../../src/polls/counters.js";
import { rebuildLineGraphTally } from "../../src/polls/lineGraphTally.js";
import { refreshProjection } from "../../src/polls/versions.js";
import { forgetTabs } from "../../src/refresh/tabVersions.js";
import { writeBatch } from "../../src/votes/consumer.js";
import { InputError, matchChoices } from "./populate-poll.js";

export { InputError };

export const VOTER_DOMAIN = "crowdpolltest.test";
const DEFAULT_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "test-poll.json");
const VOTE_WINDOW_MS = 3_600_000;
const SINGLE_CHOICE_VOTE_CHANCE = 0.8;

export interface TestPoll {
  creatorEmail: string;
  voters: string[];
  title: string;
  subtitle: string;
  choices: string[];
  choiceMode: "Single-Choice Poll" | "Multiple-Choice Poll";
  pollVisibility: "Private Poll" | "Public Poll";
  voteAnonymity: "Yes" | "No";
}

export interface TestSummary {
  pollId: string;
  outcome: "created" | "refreshed";
  picks: { voter: string; labels: string[] }[];
}

type Bounds = { minChoices: number; maxChoices: number };
type Deps = { db: Db; cache: Cache; config: Pick<AppConfig, "publicOrigin" | "databaseUrl" | "valkeyUrl"> };
type Options = { now?: Date; random?: () => number; log?: (line: string) => void };
type QueuedVote = Parameters<typeof writeBatch>[1][number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function text(record: Record<string, unknown>, key: string, max: number, required: boolean): string {
  const value = record[key];
  if (typeof value !== "string") throw new InputError(`"${key}" must be text`);
  if (required && value.trim() === "") throw new InputError(`"${key}" is empty`);
  if (value.length > max) throw new InputError(`"${key}" is longer than ${max} characters`);
  return value;
}

export function parseTestPoll(json: unknown, bounds: Bounds): TestPoll {
  if (!isRecord(json)) throw new InputError("the file must hold one JSON object");
  const creatorEmail = json.creator;
  if (typeof creatorEmail !== "string" || !/^[^@\s]+@[^@\s]+$/.test(creatorEmail)) {
    throw new InputError(`"creator" must be an email address, not ${JSON.stringify(creatorEmail)}`);
  }

  const voters = json.voters;
  if (!Array.isArray(voters) || voters.length === 0) throw new InputError(`"voters" must be a list of at least one name`);
  const seen = new Set<string>();
  for (const voter of voters) {
    if (typeof voter !== "string" || !/^[A-Za-z0-9._-]{1,64}$/.test(voter)) {
      throw new InputError(`voter ${JSON.stringify(voter)} must be 1 to 64 letters, digits, ".", "_" or "-"`);
    }
    if (seen.has(voter.toLowerCase())) throw new InputError(`voter "${voter}" is listed twice`);
    seen.add(voter.toLowerCase());
  }

  const poll = json.poll;
  if (!isRecord(poll)) throw new InputError(`"poll" must be an object`);
  const title = text(poll, "title", TITLE_MAX, true);
  const subtitle = text(poll, "subtitle", SUBTITLE_MAX, false);

  const choices = poll.choices;
  if (!Array.isArray(choices)) throw new InputError(`"poll.choices" must be a list`);
  for (const label of choices) {
    if (typeof label !== "string" || label.trim() === "" || label.length > CHOICE_LABEL_MAX) {
      throw new InputError(`choice ${JSON.stringify(label)} must be a label of 1 to ${CHOICE_LABEL_MAX} characters`);
    }
    if (choices.indexOf(label) !== choices.lastIndexOf(label)) throw new InputError(`choice "${label}" is listed twice`);
  }
  if (choices.length < bounds.minChoices || choices.length > bounds.maxChoices) {
    throw new InputError(`"poll.choices" has ${choices.length} choice(s); ${bounds.minChoices} to ${bounds.maxChoices} are allowed`);
  }

  const modes = { "single-choice": "Single-Choice Poll", "multiple-choice": "Multiple-Choice Poll" } as const;
  const choiceMode = modes[poll.type as keyof typeof modes];
  if (!choiceMode) throw new InputError(`"poll.type" must be "single-choice" or "multiple-choice"`);
  const visibilities = { private: "Private Poll", public: "Public Poll" } as const;
  const pollVisibility = visibilities[poll.visibility as keyof typeof visibilities];
  if (!pollVisibility) throw new InputError(`"poll.visibility" must be "private" or "public"`);
  if (typeof poll.showVoterChoices !== "boolean") throw new InputError(`"poll.showVoterChoices" must be true or false`);
  const voteAnonymity = pollVisibility === "Private Poll" && poll.showVoterChoices ? "No" : "Yes";

  return { creatorEmail, voters: voters as string[], title, subtitle, choices: choices as string[], choiceMode, pollVisibility, voteAnonymity };
}

export function pickChoices(choiceIds: string[], multiple: boolean, random: () => number): string[] {
  if (!multiple) {
    return random() < SINGLE_CHOICE_VOTE_CHANCE ? [choiceIds[Math.floor(random() * choiceIds.length)]!] : [];
  }
  const count = Math.floor(random() * (choiceIds.length + 1));
  const pool = choiceIds.slice();
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, count);
}

export const voterEmail = (name: string): string => `${name.toLowerCase()}@${VOTER_DOMAIN}`;

async function ensureVoters(db: Db, names: string[], now: Date): Promise<number> {
  const emails = names.map(voterEmail);
  const existing = new Set(
    (await db.selectFrom("user").select("email").where("email", "in", emails).execute()).map((row) => row.email)
  );
  const missing = names.filter((name) => !existing.has(voterEmail(name)));
  if (missing.length > 0) {
    await db
      .insertInto("user")
      .values(missing.map((name) => ({ id: randomUUID(), name, userName: name, email: voterEmail(name), emailVerified: true, createdAt: now, updatedAt: now })))
      .execute();
  }
  return missing.length;
}

export async function populateTestPoll(deps: Deps, file: TestPoll, options: Options = {}): Promise<TestSummary> {
  const { db, cache, config } = deps;
  const { now = new Date(), random = Math.random, log = console.log } = options;
  log(`[populate-test] Target: ${config.publicOrigin} (database ${new URL(config.databaseUrl).host})`);

  const creator = await db
    .selectFrom("user")
    .select(["id", "userName", "name"])
    .where("email", "=", file.creatorEmail)
    .executeTakeFirst();
  if (!creator) throw new InputError(`no user with the email ${maskAddress(file.creatorEmail)}`);

  const created = await ensureVoters(db, file.voters, now);
  log(`[populate-test] Voter accounts: ${created} created, ${file.voters.length - created} reused`);

  const settings = {
    title: file.title,
    subtitle: file.subtitle,
    choiceMode: file.choiceMode,
    voteMutability: "Dynamic-Vote Poll" as const,
    pollVisibility: file.pollVisibility,
    pollSharingMode: "Anyone With The Link" as const,
    voteAnonymity: file.voteAnonymity,
    voterCountLimit: null,
    endAt: null,
    startAt: now,
    pollState: "OPEN" as const
  };
  const matched = await db
    .selectFrom("polls")
    .select(["id", "choices"])
    .where("created_by_id", "=", creator.id)
    .where("title", "=", file.title)
    .orderBy("created_at", "desc")
    .orderBy("id")
    .executeTakeFirst();

  let pid: string;
  let choices: Choice[];
  const touched = new Set<string>([file.creatorEmail, ...file.voters.map(voterEmail)]);
  if (matched) {
    pid = matched.id;
    const related = await db
      .selectFrom("user_polls")
      .select("email")
      .where("poll_id", "=", pid)
      .where("relation", "in", ["voted", "linked"])
      .execute();
    related.forEach((row) => touched.add(row.email));
    const removed = await db.deleteFrom("votes").where("poll_id", "=", pid).executeTakeFirst();
    await db.deleteFrom("vote_history").where("poll_id", "=", pid).execute();
    await rebuildLineGraphTally(db, pid);
    await db.deleteFrom("user_polls").where("poll_id", "=", pid).where("relation", "in", ["voted", "linked"]).execute();
    log(`[populate-test] Removed ${Number(removed.numDeletedRows)} earlier vote(s) from poll ${pid}`);
    choices = matchChoices(matched.choices, file.choices).choices;
    await updatePoll({ db, cache }, pid, {
      ...settings,
      keywords: "",
      choices,
      pollStateBeforeEditUpdate: null,
      pollEditUpdateHeartbeatTimestamp: null,
      pollEditUpdateClientGUID: null
    });
  } else {
    const poll = createDefaultPoll(now);
    choices = file.choices.map((label, position) => ({ id: randomUUID(), label, position }));
    Object.assign(poll, settings, { choices, createdAt: now });
    await insertPoll({ db, cache }, poll, { id: creator.id, name: creator.userName ?? creator.name, email: file.creatorEmail });
    pid = poll._id;
  }
  await db.updateTable("polls").set({ launched_at: sql`start_at` }).where("id", "=", pid).execute();

  const multiple = file.choiceMode === "Multiple-Choice Poll";
  const ids = choices.map((choice) => choice.id);
  const votes: QueuedVote[] = [];
  const linked: string[] = [];
  const picks = file.voters.map((voter) => {
    const choiceIds = pickChoices(ids, multiple, random);
    if (choiceIds.length === 0) {
      linked.push(voterEmail(voter));
    } else {
      votes.push({
        pid,
        email: voterEmail(voter),
        userName: voter,
        choiceIds,
        votedAt: new Date(now.getTime() - Math.floor(random() * VOTE_WINDOW_MS)),
        voteMutability: "Dynamic-Vote Poll"
      });
    }
    return { voter, labels: choices.filter((choice) => choiceIds.includes(choice.id)).map((choice) => choice.label) };
  });
  await writeBatch(db, votes);
  await upsertUserPolls(db, linked.map((email) => ({ email, pid, relation: "linked" as const })), now);
  await reconcile({ db, cache }, [pid]);
  await refreshProjection(cache, (await findPollRow(db, pid))!);
  await forgetTabs(cache, touched);

  const outcome = matched ? "refreshed" : "created";
  log(`[populate-test] Done: poll ${pid} ${outcome}: ${config.publicOrigin}/?PID=${pid}`);
  log(`[populate-test]   ${votes.length} voted, ${linked.length} picked nothing`);
  for (const pick of picks) log(`[populate-test]   ${pick.voter}: ${pick.labels.join(", ") || "(no vote)"}`);
  if (!config.valkeyUrl) log("[populate-test] Note: no shared cache is configured (ENV_VALKEY_URL); restart the server to see the new counts");
  return { pollId: pid, outcome, picks };
}

export function resolveFile(argv: string[], baseDir: string): string {
  if (argv.length > 1) throw new InputError("Usage: npm run populate-test-poll [<test-poll.json>]");
  return argv[0] ? path.resolve(baseDir, argv[0]) : DEFAULT_FILE;
}

async function main(): Promise<void> {
  let close = async (): Promise<void> => {};
  try {
    const file = resolveFile(process.argv.slice(2), process.env.INIT_CWD ?? process.cwd());
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
      throw new InputError(`cannot read ${file}: ${(err as Error).message}`);
    }
    const config = loadConfig();
    const testPoll = parseTestPoll(json, config);
    const db = createDb(config.databaseUrl, { caCert: config.databaseCaCert });
    close = () => closeDb(db);
    const cache = await createCache(config);
    close = async () => {
      await cache.close();
      await closeDb(db);
    };
    await populateTestPoll({ db, cache, config }, testPoll);
  } catch (err) {
    console.error(err instanceof InputError ? `[populate-test] Error: ${err.message}` : `[populate-test] failed: ${(err as Error).message}`);
    process.exitCode = 1;
  } finally {
    await close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
