/**
 * Recomputes the vote counters of every poll with live counters (or, without a
 * shared cache, of every poll that has votes) from the `votes` table, and exits.
 * Usage:  npm run reconcile   (needs the same ENV_* variables as the server)
 */
import { loadConfig } from "../src/config.js";
import { createCache } from "../src/cache/cache.js";
import { createDb, closeDb } from "../src/db/client.js";
import { pollsWithCounters, reconcile } from "../src/polls/counters.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const db = createDb(config.databaseUrl, { caCert: config.databaseCaCert });
  const cache = await createCache(config);
  try {
    let pids = await pollsWithCounters(cache);
    if (pids.length === 0) {
      const rows = await db.selectFrom("votes").select("poll_id").distinct().execute();
      pids = rows.map((r) => r.poll_id);
    }
    const done = await reconcile({ db, cache }, pids);
    console.log(`[reconcile] ${done} poll(s) reconciled`);
  } finally {
    await cache.close();
    await closeDb(db);
  }
}

main().catch((err) => {
  console.error("[reconcile] failed:", err);
  process.exit(1);
});
