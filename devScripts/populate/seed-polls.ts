/**
 * Seeds the database with N public polls and a Zipf-skewed vote distribution (a
 * few hundred polls receive most votes), writing votes through the consumer's
 * batch insert so the rows, the history and the personal-tab relations are the
 * ones the application itself produces.
 *
 * Usage:  npx tsx devScripts/populate/seed-polls.ts --polls 250000 --skew [--votes 2000000] [--users 50000]
 * Needs the server's ENV_* variables (at least ENV_DATABASE_URL and ENV_BETTER_AUTH_SECRET).
 */
import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { loadConfig } from "../../src/config.js";
import { createDb, closeDb } from "../../src/db/client.js";
import { migrateToLatest } from "../../src/db/migrator.js";
import { writeBatch } from "../../src/votes/consumer.js";
import { reconcile } from "../../src/polls/counters.js";
import { MemoryCache } from "../../src/cache/memoryCache.js";

const args = process.argv.slice(2);
const flag = (name: string, fallback: number) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? Number(args[at + 1]) : fallback;
};
const POLLS = flag("polls", 250_000);
const VOTES = flag("votes", Math.min(2_000_000, POLLS * 8));
const USERS = flag("users", 50_000);
const SKEW = args.includes("--skew");
const BATCH = 1000;

const WORDS = ["coffee", "tea", "cycling", "trains", "budget", "summer", "winter", "cats", "dogs", "music", "cinema", "gardens", "pizza", "chess", "football", "books", "space", "rivers", "mountains", "markets"];
const STATES = ["OPEN", "OPEN", "OPEN", "OPEN", "CLOSED", "WAITING TO OPEN"];

function pick<T>(list: T[], i: number): T {
  return list[i % list.length]!;
}

/** Zipf rank: a few hundred polls draw most votes. */
function zipfIndex(random: number, n: number): number {
  const s = 1.07;
  const max = Math.pow(n, 1 - s);
  const u = 1 - random * (1 - max);
  return Math.min(n - 1, Math.max(0, Math.floor(Math.pow(u, 1 / (1 - s))) - 1));
}

async function main(): Promise<void> {
  const config = loadConfig();
  const db = createDb(config.databaseUrl);
  await migrateToLatest(db);
  console.log(`[seed] ${POLLS} polls, ${VOTES} votes, ${USERS} voters${SKEW ? ", Zipf-skewed" : ""}`);

  const ids: string[] = [];
  const mutability: string[] = [];
  const now = Date.now();
  for (let i = 0; i < POLLS; i += BATCH) {
    const rows = [];
    for (let j = i; j < Math.min(POLLS, i + BATCH); j++) {
      const id = randomUUID();
      ids.push(id);
      const dynamic = j % 5 === 0;
      mutability.push(dynamic ? "Dynamic-Vote Poll" : "Final-Vote Poll");
      const state = pick(STATES, j);
      const choices = [0, 1, 2].map((c) => ({ id: `c${c + 1}`, label: `${pick(WORDS, j + c)} ${c + 1}`, position: c }));
      rows.push({
        id,
        title: `${pick(WORDS, j)} ${pick(WORDS, j * 7 + 3)} poll ${j}`,
        subtitle: `Seeded ${pick(WORDS, j * 3)} question`,
        choices: JSON.stringify(choices),
        choice_labels: choices.map((c) => c.label).join(" "),
        poll_state: state,
        poll_visibility: "Public Poll",
        poll_sharing_mode: "Anyone With The Link",
        vote_anonymity: "Yes",
        choice_mode: "Single-Choice Poll",
        vote_mutability: dynamic ? "Dynamic-Vote Poll" : "Final-Vote Poll",
        created_by_id: `seed-user-${j % USERS}`,
        created_by_name: `seed${j % USERS}`,
        created_at: new Date(now - j * 60_000),
        start_at: state === "WAITING TO OPEN" ? new Date(now + 86_400_000) : null,
        end_at: state === "CLOSED" ? new Date(now - 3_600_000) : null,
        closed_at: state === "CLOSED" ? new Date(now - 3_600_000) : null,
        launched_at: state === "OPEN" ? new Date(now - j * 60_000) : null
      });
    }
    await db.insertInto("polls").values(rows).execute();
    if ((i / BATCH) % 25 === 0) console.log(`[seed] ${Math.min(POLLS, i + BATCH)} polls`);
  }

  let written = 0;
  while (written < VOTES) {
    const batch = [];
    for (let k = 0; k < BATCH && written + k < VOTES; k++) {
      const random = Math.random();
      const at = SKEW ? zipfIndex(random, ids.length) : Math.floor(random * ids.length);
      const voter = Math.floor(Math.random() * USERS);
      batch.push({
        pid: ids[at]!,
        email: `seed${voter}@example.com`,
        userName: `seed${voter}`,
        choiceIds: [`c${1 + Math.floor(Math.random() * 3)}`],
        votedAt: new Date(now - Math.floor(Math.random() * 30 * 86_400_000)),
        voteMutability: mutability[at]!
      });
    }
    await writeBatch(db, batch);
    written += batch.length;
    if ((written / BATCH) % 100 === 0) console.log(`[seed] ${written} votes`);
  }

  console.log("[seed] reconciling counters from the vote rows");
  const cache = new MemoryCache();
  for (let i = 0; i < ids.length; i += 500) await reconcile({ db, cache }, ids.slice(i, i + 500));
  await sql`analyze polls`.execute(db);
  await sql`analyze votes`.execute(db);
  await closeDb(db);
  console.log("[seed] done");
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
