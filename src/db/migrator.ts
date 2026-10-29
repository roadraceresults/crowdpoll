import { Migrator, type MigrationProvider } from "kysely/migration";
import type { Db } from "./client.js";
import { migrations } from "./migrations/index.js";

export class MigrationError extends Error {}

const provider: MigrationProvider = {
  getMigrations: async () => migrations
};

export async function migrateToLatest(db: Db): Promise<string[]> {
  const migrator = new Migrator({ db, provider });
  const { error, results } = await migrator.migrateToLatest();
  const applied = (results ?? []).filter((r) => r.status === "Success").map((r) => r.migrationName);
  if (error) {
    const failed = (results ?? []).find((r) => r.status === "Error");
    const message = error instanceof Error ? error.message : String(error);
    if (failed) throw new MigrationError(`Migration ${failed.migrationName} failed: ${message}`);
    const hint = message.startsWith("corrupted migrations")
      ? "\nRun npm run fix-migrations in this folder; see devScripts/MIGRATIONS-HOWTO.md."
      : "";
    throw new MigrationError(`Migration check failed: ${message}${hint}`);
  }
  return applied;
}
