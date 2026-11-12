/**
 * Removes the cached projection of every poll that no longer exists in the database, so a poll deleted by
 * hand in SQL leaves the tabs that still list it. Changes nothing in the database, and exits.
 * Usage:  npm run forget-deleted-polls   (needs the same ENV_* variables as the server)
 */
import { pathToFileURL } from "node:url";
import { loadConfig } from "../src/config.js";
import { createCache, type Cache } from "../src/cache/cache.js";
import { createDb, closeDb, type Db } from "../src/db/client.js";
import { forgetProjections } from "../src/polls/store.js";
import { POLL_PROJECTION_KEY } from "../src/polls/versions.js";

const PROJECTION_PREFIX = POLL_PROJECTION_KEY("");

export async function forgetDeletedPolls(db: Db, cache: Cache): Promise<string[]> {
  const cachedIds = (await cache.scan(`${PROJECTION_PREFIX}*`)).map((key) => key.slice(PROJECTION_PREFIX.length));
  if (cachedIds.length === 0) return [];
  const rows = await db.selectFrom("polls").select("id").where("id", "in", cachedIds).execute();
  const existing = new Set(rows.map((row) => row.id));
  const deletedIds = cachedIds.filter((pid) => !existing.has(pid));
  await forgetProjections(cache, deletedIds);
  return deletedIds;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const db = createDb(config.databaseUrl, { caCert: config.databaseCaCert });
  const cache = await createCache(config);
  try {
    const forgotten = await forgetDeletedPolls(db, cache);
    console.log(`[forget-deleted-polls] ${forgotten.length} deleted poll(s) forgotten`);
  } finally {
    await cache.close();
    await closeDb(db);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("[forget-deleted-polls] failed:", err);
    process.exitCode = 1;
  });
}
