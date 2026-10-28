import { Kysely, PostgresDialect, type LogEvent } from "kysely";
import pg from "pg";
import type { Database } from "./schema.js";

export type Db = Kysely<Database>;

const POOL_MAX = 20;

// pg hands bigint columns back as strings by default; every bigint here (versions,
// the rate limiter's timestamp) fits a JavaScript number. https://node-postgres.com/features/types
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

export interface DbOptions {
  max?: number;
  /** PEM of the CA that signed the server's certificate: connect with full verification against it. */
  caCert?: string;
  log?: (event: LogEvent) => void;
}

/**
 * pg parses the URL after the options and lets its sslmode override an explicit `ssl`, and
 * treats `require` as `verify-full` against the system roots. A managed database's certificate
 * is signed by the provider's own CA, so with one given the sslmode parameters are dropped and
 * the CA is passed as `ssl`: encrypted, and still verified, against that CA.
 */
export function poolConfigFor(databaseUrl: string, caCert?: string): pg.PoolConfig {
  if (!caCert) return { connectionString: databaseUrl };
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("uselibpqcompat");
  return { connectionString: url.toString(), ssl: { ca: caCert } };
}

export function createDb(databaseUrl: string, options: DbOptions = {}): Db {
  const pool = new pg.Pool({ ...poolConfigFor(databaseUrl, options.caCert), max: options.max ?? POOL_MAX, keepAlive: false });
  pool.on("error", (err) => {
    console.error("[db] An idle connection was dropped; it is discarded and the next query opens a new one:", err.message);
  });
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }), log: options.log });
}

export async function closeDb(db: Db): Promise<void> {
  await db.destroy();
}
