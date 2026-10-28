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
    throw new MigrationError(
      `Migration ${failed?.migrationName ?? "(unknown)"} failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  return applied;
}
