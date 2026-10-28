// Creates or refreshes one poll from a JSON data file and replays its time series as votes; usage in devScripts/populate/README.md.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { sql } from "kysely";
import { loadConfig, type AppConfig } from "../../src/config.js";
import { createCache, type Cache } from "../../src/cache/cache.js";
import { createDb, closeDb, type Db } from "../../src/db/client.js";
import { CHOICE_LABEL_MAX, createDefaultPoll, TITLE_MAX } from "../../src/polls/service.js";
import { findPollRow, insertPoll, updatePoll, type Choice } from "../../src/polls/store.js";
import { reconcile } from "../../src/polls/counters.js";
import { refreshProjection } from "../../src/polls/versions.js";
import { writeBatch } from "../../src/votes/consumer.js";

export class InputError extends Error {}

export interface PollData {
  creatorEmail: string;
  title: string;
  choices: { key: string; label: string }[];
  voteCount: number;
  dataPoints: { date: Date; percentages: number[] }[];
}

export interface Summary {
  pollId: string;
  outcome: "created" | "refreshed";
  votesDeleted: number;
  votesWritten: number;
  final: { label: string; count: number; percent: number }[];
  elapsedMs: number;
  notes: string[];
}

const SIMULATED_DOMAIN = "crowdpolltest.test";
const SPREAD = 0.15;
const BATCH = 5000;
const DAY_MS = 86_400_000;

type Bounds = { minChoices: number; maxChoices: number };
type DataPoint = PollData["dataPoints"][number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parseDate(value: unknown, index: number): Date {
  const match = typeof value === "string" ? /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value) : null;
  const [mm, dd, yy] = (match ?? []).slice(1).map(Number);
  const date = new Date(2000 + yy!, mm! - 1, dd!);
  if (!match || date.getMonth() !== mm! - 1 || date.getDate() !== dd!) {
    throw new InputError(`data point ${index}: ${JSON.stringify(value)} is not a MM/DD/YY date`);
  }
  return date;
}

function requiredText(file: Record<string, unknown>, key: string): string {
  const value = file[key];
  if (typeof value !== "string" || value.trim() === "") throw new InputError(`"${key}" is missing or empty`);
  return value;
}

export function parsePollData(json: unknown, bounds: Bounds): PollData {
  if (!isRecord(json)) throw new InputError("the file must hold one JSON object");
  const file = json;
  const creatorEmail = requiredText(file, "poll creator email");
  const title = requiredText(file, "title");
  if (title.length > TITLE_MAX) throw new InputError(`"title" is longer than ${TITLE_MAX} characters`);

  const choices = Object.keys(file)
    .filter((key) => /^choice_[a-z]+$/.test(key))
    .sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0))
    .map((key) => ({ key, label: file[key] }));
  for (const { key, label } of choices) {
    if (typeof label !== "string" || label.trim() === "" || label.length > CHOICE_LABEL_MAX) {
      throw new InputError(`"${key}" must be a label of 1 to ${CHOICE_LABEL_MAX} characters`);
    }
    const first = choices.find((c) => c.label === label)!;
    if (first.key !== key) throw new InputError(`"${first.key}" and "${key}" have the same label`);
  }
  if (choices.length < bounds.minChoices) {
    throw new InputError(`the file has ${choices.length} choice(s); at least ${bounds.minChoices} are needed`);
  }
  if (choices.length > bounds.maxChoices) {
    throw new InputError(`the file has ${choices.length} choice(s); at most ${bounds.maxChoices} are allowed`);
  }

  const voteCount = file.vote_count;
  if (typeof voteCount !== "number" || !Number.isInteger(voteCount) || voteCount < 1) {
    throw new InputError(`"vote_count" must be a whole number of at least 1, not ${JSON.stringify(voteCount)}`);
  }

  const rawPoints = file.data_points;
  if (!Array.isArray(rawPoints) || rawPoints.length === 0) throw new InputError(`"data_points" is missing or empty`);
  const keys = new Set(choices.map((c) => c.key));
  const seen = new Set<string>();
  const dataPoints = rawPoints
    .map((point: unknown, index) => {
      if (!isRecord(point)) throw new InputError(`data point ${index} is not an object`);
      const date = parseDate(point.date, index);
      if (seen.has(point.date as string)) throw new InputError(`two data points have the date ${point.date as string}`);
      seen.add(point.date as string);
      for (const [key, value] of Object.entries(point)) {
        if (key === "date") continue;
        if (!keys.has(key)) throw new InputError(`data point ${index}: "${key}" is not one of the choices`);
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
          throw new InputError(`data point ${index}: "${key}" must be a number of at least 0`);
        }
      }
      const percentages = choices.map((c) => (point[c.key] as number | undefined) ?? 0);
      if (percentages.reduce((a, b) => a + b, 0) <= 0) {
        throw new InputError(`data point ${index} (${point.date as string}): the percentages add up to 0`);
      }
      return { date, percentages };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return { creatorEmail, title, choices: choices.map((c) => ({ key: c.key, label: c.label as string })), voteCount, dataPoints };
}

export function readArguments(argv: string[]): string {
  if (argv.length !== 1) throw new InputError("Usage: npx tsx devScripts/populate/populate-poll.ts <poll-data.json>");
  return argv[0]!;
}

const calendarDay = (d: Date): number => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS;

export function shiftDates(points: DataPoint[], today: Date): DataPoint[] {
  const latest = points[points.length - 1]!.date;
  const offset = calendarDay(today) - calendarDay(latest);
  return points.map((p) => ({
    date: new Date(p.date.getFullYear(), p.date.getMonth(), p.date.getDate() + offset),
    percentages: p.percentages
  }));
}

export function voteCountFor(base: number, random: () => number): number {
  return Math.round(base * (1 - SPREAD + 2 * SPREAD * random()));
}

export function splitByShares(count: number, percentages: number[]): number[] {
  const sum = percentages.reduce((a, b) => a + b, 0);
  const exact = percentages.map((p) => (count * p) / sum);
  const split = exact.map(Math.floor);
  let remaining = count - split.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remaining === 0) break;
    split[i]!++;
    remaining--;
  }
  return split;
}

export function voteTimesFor(day: Date, now: Date, random: () => number): () => Date {
  const start = day.getTime();
  const nextMidnight = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime();
  const span = Math.min(nextMidnight, now.getTime()) - start;
  return () => new Date(start + Math.floor(random() * span));
}

export function matchChoices(existing: Choice[], labels: string[]): { choices: Choice[]; droppedIds: string[] } {
  const choices = labels.map((label, position) => ({ id: existing.find((c) => c.label === label)?.id ?? randomUUID(), label, position }));
  const kept = new Set(choices.map((c) => c.id));
  return { choices, droppedIds: existing.map((c) => c.id).filter((id) => !kept.has(id)) };
}

type Deps = { db: Db; cache: Cache; config: Pick<AppConfig, "publicOrigin" | "databaseUrl" | "valkeyUrl"> };
type Options = { now?: Date; random?: () => number; log?: (line: string) => void };
type QueuedVote = Parameters<typeof writeBatch>[1][number];

const grouped = (n: number): string => n.toLocaleString("en-US");
const isoDay = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthsBetween = (a: Date, b: Date): number =>
  (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() - (b.getDate() < a.getDate() ? 1 : 0);

function elapsed(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export async function populatePoll(deps: Deps, data: PollData, options: Options = {}): Promise<Summary> {
  const { db, cache, config } = deps;
  const { now = new Date(), random = Math.random, log = console.log } = options;
  const started = Date.now();
  log(`[populate] Target: ${config.publicOrigin} (database ${new URL(config.databaseUrl).host})`);

  const creator = await db
    .selectFrom("user")
    .select(["id", "userName", "name"])
    .where("email", "=", data.creatorEmail)
    .executeTakeFirst();
  if (!creator) throw new InputError(`no user with the email ${data.creatorEmail}`);
  const matches = await db
    .selectFrom("polls")
    .select(["id", "poll_state", "choices"])
    .where("created_by_id", "=", creator.id)
    .where("title", "=", data.title)
    .orderBy("created_at", "desc")
    .orderBy("id")
    .execute();
  const points = shiftDates(data.dataPoints, now);
  const firstDay = points[0]!.date;
  const lastDay = points[points.length - 1]!.date;

  let pid: string;
  let choices: Choice[];
  let votesDeleted = 0;
  const matched = matches[0];
  if (matched) {
    pid = matched.id;
    if (matches.length > 1) {
      log(`[populate] Warning: ${matches.length} polls match "${data.title}" for ${data.creatorEmail}; using the newest, ${pid}`);
    }
    const simulated = sql<boolean>`email like ${"test\\_%@" + SIMULATED_DOMAIN} escape '\\'`;
    const removed = await db.deleteFrom("votes").where("poll_id", "=", pid).where(simulated).executeTakeFirst();
    await db.deleteFrom("vote_history").where("poll_id", "=", pid).where(simulated).execute();
    await db.deleteFrom("user_polls").where("poll_id", "=", pid).where("relation", "=", "voted").where(simulated).execute();
    votesDeleted = Number(removed.numDeletedRows);
    log(`[populate] Removed ${grouped(votesDeleted)} earlier test vote(s)`);

    const match = matchChoices(matched.choices, data.choices.map((c) => c.label));
    choices = match.choices;
    if (match.droppedIds.length > 0) {
      await db.deleteFrom("votes").where("poll_id", "=", pid).where(sql<boolean>`choice_ids && ${match.droppedIds}::text[]`).execute();
    }
    await updatePoll({ db, cache }, pid, {
      title: data.title,
      subtitle: "",
      keywords: "",
      choiceMode: "Single-Choice Poll",
      voteMutability: "Dynamic-Vote Poll",
      pollVisibility: "Public Poll",
      pollSharingMode: "Anyone With The Link",
      voteAnonymity: "Yes",
      voterCountLimit: null,
      endAt: null,
      startAt: firstDay,
      choices,
      pollState: "OPEN",
      pollStateBeforeEditUpdate: null,
      pollEditUpdateHeartbeatTimestamp: null,
      pollEditUpdateClientGUID: null
    });
    await db.updateTable("polls").set({ launched_at: sql`start_at` }).where("id", "=", pid).execute();
    await refreshProjection(cache, (await findPollRow(db, pid))!);
    if (matched.poll_state !== "OPEN") log(`[populate] Warning: poll ${pid} was ${matched.poll_state}; it is OPEN again`);
  } else {
    const poll = createDefaultPoll(now);
    choices = data.choices.map((c, position) => ({ id: randomUUID(), label: c.label, position }));
    Object.assign(poll, { title: data.title, subtitle: "", choices, pollState: "OPEN", startAt: firstDay, createdAt: firstDay, endAt: null });
    await insertPoll({ db, cache }, poll, { id: creator.id, name: creator.userName ?? creator.name, email: data.creatorEmail });
    pid = poll._id;
  }

  let votesWritten = 0;
  for (const point of points) {
    const count = voteCountFor(data.voteCount, random);
    const voters = Array.from({ length: count }, (_, i) => i + 1);
    const perChoice = splitByShares(count, point.percentages);
    const timeOf = voteTimesFor(point.date, now, random);
    const votes: QueuedVote[] = [];
    let next = 0;
    perChoice.forEach((n, index) => {
      for (const voter of voters.slice(next, next + n)) {
        votes.push({
          pid,
          email: `test_${voter}@${SIMULATED_DOMAIN}`,
          userName: `test_${voter}`,
          choiceIds: [choices[index]!.id],
          votedAt: timeOf(),
          voteMutability: "Dynamic-Vote Poll"
        });
      }
      next += n;
    });
    for (let i = 0; i < votes.length; i += BATCH) await writeBatch(db, votes.slice(i, i + BATCH));
    votesWritten += votes.length;
    log(`[populate] ${isoDay(point.date)}  votes ${grouped(votes.length)}  total ${grouped(votesWritten)}`);
  }

  await reconcile({ db, cache }, [pid]);
  const row = await db.selectFrom("polls").select(["vote_count", "choice_counts"]).where("id", "=", pid).executeTakeFirstOrThrow();
  const final = choices.map((c) => {
    const count = row.choice_counts[c.id] ?? 0;
    return { label: c.label, count, percent: row.vote_count > 0 ? Math.round((count / row.vote_count) * 1000) / 10 : 0 };
  });
  const notes: string[] = [];
  if (lastDay > new Date(firstDay.getFullYear(), firstDay.getMonth() + 12, firstDay.getDate())) {
    notes.push(`the data span ${monthsBetween(firstDay, lastDay)} months; vote history older than 12 months is removed by the daily retention sweep`);
  }
  if (!config.valkeyUrl) notes.push("no shared cache is configured (ENV_VALKEY_URL); restart the server to see the new counts");

  const outcome = matches.length > 0 ? "refreshed" : "created";
  const elapsedMs = Date.now() - started;
  log(`[populate] Done: poll ${pid} ${outcome}`);
  log(`[populate]   Votes deleted: ${grouped(votesDeleted)}   Votes written: ${grouped(votesWritten)}`);
  for (const f of final) log(`[populate]   ${f.label}: ${grouped(f.count)} (${f.percent.toFixed(1)}%)`);
  log(`[populate]   Elapsed: ${elapsed(elapsedMs)}`);
  for (const note of notes) log(`[populate] Note: ${note}`);
  return { pollId: pid, outcome, votesDeleted, votesWritten, final, elapsedMs, notes };
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new InputError(`cannot read ${path}: ${(err as Error).message}`);
  }
}

async function main(): Promise<void> {
  let close = async (): Promise<void> => {};
  try {
    const json = readJson(readArguments(process.argv.slice(2)));
    const config = loadConfig();
    const data = parsePollData(json, config);
    const db = createDb(config.databaseUrl, { caCert: config.databaseCaCert });
    close = () => closeDb(db);
    const cache = await createCache(config);
    close = async () => {
      await cache.close();
      await closeDb(db);
    };
    await populatePoll({ db, cache, config }, data);
  } catch (err) {
    console.error(err instanceof InputError ? `[populate] Error: ${err.message}` : `[populate] failed: ${(err as Error).message}`);
    process.exitCode = 1;
  } finally {
    await close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
