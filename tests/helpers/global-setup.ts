import EmbeddedPostgres from "embedded-postgres";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    pgAdminUrl: string;
  }
}

/**
 * One PostgreSQL cluster per test run; every suite gets its own database inside it.
 * TEST_PG_ADMIN_URL (a `.../postgres` URL for a role that may create databases) points the run at an existing
 * server instead, for machines where Smart App Control blocks the embedded binaries.
 */
export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const external = process.env.TEST_PG_ADMIN_URL;
  if (external) {
    // The suites create and drop databases, so only a server on this machine is accepted, always through its
    // maintenance database: each suite's database name replaces that path.
    const url = new URL(external);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      throw new Error("TEST_PG_ADMIN_URL must point at a PostgreSQL server on this machine (localhost).");
    }
    url.pathname = "/postgres";
    url.search = "";
    project.provide("pgAdminUrl", url.toString());
    return async () => {};
  }
  const port = 54_800 + (Number(process.env.VITEST_POOL_ID ?? 0) % 100);
  const databaseDir = mkdtempSync(path.join(tmpdir(), "crowdpoll-pg-"));
  const postgres = new EmbeddedPostgres({
    databaseDir,
    user: "test",
    password: "test",
    port,
    persistent: false,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
    onError: () => {}
  });
  await postgres.initialise();
  await postgres.start();
  project.provide("pgAdminUrl", `postgres://test:test@localhost:${port}/postgres`);
  return async () => {
    await postgres.stop();
    rmSync(databaseDir, { recursive: true, force: true });
  };
}
