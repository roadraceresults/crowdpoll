import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import {
  databaseIdentity,
  listDataFiles,
  populateAllPolls,
  readHistory,
  readPopulateResult,
  runPopulateChild,
  writeHistory,
  type ChildResult,
  type History
} from "../devScripts/populate/populate-all-polls.js";

const DATABASE_URL = "postgres://dev:secret@localhost:5432/app01";
const IDENTITY = "postgres://dev@localhost:5432/app01";

function tempDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), "populate-all-"));
}

function succeeded(pollId = "poll-1", outcome = "created", votes = "1,234", eol = "\n"): ChildResult {
  const stdout = [
    "[populate] Target: http://localhost:8080 (database localhost:5432)",
    `[populate] Done: poll ${pollId} ${outcome}`,
    `[populate]   Votes deleted: 0   Votes written: ${votes}`,
    "[populate]   Elapsed: 0m 1s",
    ""
  ].join(eol);
  return { exitCode: 0, signal: null, stdout, stderr: "" };
}

function failed(message: string): ChildResult {
  return { exitCode: 1, signal: null, stdout: "[populate] Target: x\n", stderr: `[populate] Error: ${message}\n` };
}

interface Folder {
  root: string;
  dir: string;
  historyPath: string;
}

function folder(files: Record<string, string>): Folder {
  const root = tempDir();
  const dir = path.join(root, "polldata");
  mkdirSync(dir);
  for (const [name, content] of Object.entries(files)) writeFileSync(path.join(dir, name), content);
  return { root, dir, historyPath: path.join(root, "history.json") };
}

interface Run {
  code: number;
  lines: string[];
  errors: string[];
  calls: string[];
}

async function run(
  f: Folder,
  runner: (file: string) => ChildResult | Promise<ChildResult> = () => succeeded(),
  overrides: { argv?: string[]; env?: NodeJS.ProcessEnv; projectRoot?: string } = {}
): Promise<Run> {
  const lines: string[] = [];
  const errors: string[] = [];
  const calls: string[] = [];
  const code = await populateAllPolls({
    argv: overrides.argv ?? [f.dir],
    env: overrides.env ?? { ENV_DATABASE_URL: DATABASE_URL },
    historyPath: f.historyPath,
    projectRoot: overrides.projectRoot ?? f.root,
    runPopulate: async (file) => {
      calls.push(file);
      return runner(file);
    },
    log: (line) => void lines.push(line),
    logError: (line) => void errors.push(line)
  });
  return { code, lines, errors, calls };
}

const history = (f: Folder): History => JSON.parse(readFileSync(f.historyPath, "utf8")) as History;

describe("databaseIdentity", () => {
  it("removes the password and keeps user, host, port, database and query", () => {
    expect(databaseIdentity("postgres://u:secret@h:5432/db?sslmode=require")).toBe("postgres://u@h:5432/db?sslmode=require");
  });

  it("leaves a password-free URL unchanged", () => {
    expect(databaseIdentity("postgresql://u@h:5432/db")).toBe("postgresql://u@h:5432/db");
  });

  it("refuses a value that is not a PostgreSQL URL", () => {
    expect(() => databaseIdentity("")).toThrow(/ENV_DATABASE_URL is not set to a PostgreSQL URL/);
    expect(() => databaseIdentity("mysql://u@h/db")).toThrow(/ENV_DATABASE_URL is not set to a PostgreSQL URL/);
  });
});

describe("readPopulateResult", () => {
  it("reads the poll id, outcome and votes written of a successful run", () => {
    expect(readPopulateResult(succeeded("p-1", "created", "1,234"))).toEqual({ ok: true, pollId: "p-1", outcome: "created", votesWritten: 1234 });
    expect(readPopulateResult(succeeded("p-2", "refreshed", "56"))).toEqual({ ok: true, pollId: "p-2", outcome: "refreshed", votesWritten: 56 });
  });

  it("reads lines that end in CRLF", () => {
    expect(readPopulateResult(succeeded("p-3", "created", "7", "\r\n"))).toEqual({ ok: true, pollId: "p-3", outcome: "created", votesWritten: 7 });
  });

  it("counts a successful run without its Done line as failed", () => {
    const result = succeeded();
    result.stdout = result.stdout.replace(/^\[populate\] Done:.*$/m, "");
    expect(readPopulateResult(result)).toEqual({ ok: false, message: "populated, but its summary could not be read" });
  });

  it("counts a successful run without its Votes written line as failed", () => {
    const result = succeeded();
    result.stdout = result.stdout.replace(/^.*Votes written.*$/m, "");
    expect(readPopulateResult(result)).toEqual({ ok: false, message: "populated, but its summary could not be read" });
  });

  it("takes the last error line of a failed run, without its prefix", () => {
    expect(readPopulateResult(failed("no user with the email x@example.com"))).toEqual({ ok: false, message: "no user with the email x@example.com" });
    expect(readPopulateResult({ exitCode: 1, signal: null, stdout: "", stderr: "[populate] failed: boom\n" })).toEqual({ ok: false, message: "boom" });
  });

  it("names the exit code when a failed run printed no error line", () => {
    expect(readPopulateResult({ exitCode: 3, signal: null, stdout: "", stderr: "" })).toEqual({ ok: false, message: "exited with code 3" });
  });

  it("names the signal that stopped a run", () => {
    expect(readPopulateResult({ exitCode: null, signal: "SIGTERM", stdout: "", stderr: "" })).toEqual({ ok: false, message: "stopped by SIGTERM" });
  });
});

describe("listDataFiles", () => {
  it("takes the .json files directly in the folder, any letter case, in name order", () => {
    const f = folder({ "b.json": "{}", "A.JSON": "{}", "a.har": "{}", "notes.yaml": "" });
    mkdirSync(path.join(f.dir, "sub"));
    writeFileSync(path.join(f.dir, "sub", "c.json"), "{}");
    expect(listDataFiles(f.dir)).toEqual(["A.JSON", "b.json"]);
  });
});

describe("readHistory and writeHistory", () => {
  it("reads a missing file as an empty history", () => {
    expect(readHistory(path.join(tempDir(), "none.json"))).toEqual({ entries: [] });
  });

  it("round-trips a history and leaves no temporary file", () => {
    const file = path.join(tempDir(), "history.json");
    const written: History = {
      entries: [{ database: IDENTITY, file: "a.json", sha256: "ab", pollId: "p", outcome: "created", votesWritten: 3, populatedAt: "2026-11-01T00:00:00.000Z" }]
    };
    writeHistory(file, written);
    expect(readHistory(file)).toEqual(written);
    expect(existsSync(`${file}.tmp`)).toBe(false);
  });
});

describe("populateAllPolls", () => {
  it("populates every .json file in name order and records each", async () => {
    const f = folder({ "b.json": "b1", "a.json": "a1", "a.har": "{}" });
    let seenBeforeB: History | undefined;
    const result = await run(f, (file) => {
      if (file.endsWith("b.json")) seenBeforeB = readHistory(f.historyPath);
      return succeeded(file.endsWith("a.json") ? "poll-a" : "poll-b");
    });

    expect(result.code).toBe(0);
    expect(result.calls).toEqual([path.join(f.dir, "a.json"), path.join(f.dir, "b.json")]);
    expect(result.lines[0]).toBe(`[populate-all] Target: ${IDENTITY}`);
    expect(result.lines.at(-1)).toBe("[populate-all] Done: 2 populated, 0 skipped, 0 failed");
    expect(result.errors).toEqual([]);
    expect(seenBeforeB?.entries.map((e) => e.file)).toEqual(["a.json"]);

    const entries = history(f).entries;
    expect(entries.map((e) => [e.file, e.pollId, e.outcome, e.votesWritten])).toEqual([
      ["a.json", "poll-a", "created", 1234],
      ["b.json", "poll-b", "created", 1234]
    ]);
    for (const entry of entries) {
      expect(entry.database).toBe(IDENTITY);
      expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(new Date(entry.populatedAt).toISOString()).toBe(entry.populatedAt);
    }
    expect(readFileSync(f.historyPath, "utf8")).not.toContain("secret");
  });

  it("skips every recorded, unchanged file on a second run", async () => {
    const f = folder({ "a.json": "a1", "b.json": "b1" });
    await run(f);
    const populatedAt = history(f).entries.map((e) => e.populatedAt);

    const second = await run(f);
    expect(second.code).toBe(0);
    expect(second.calls).toEqual([]);
    expect(second.lines).toContain(`[populate-all] Skipped a.json (populated ${populatedAt[0]})`);
    expect(second.lines).toContain(`[populate-all] Skipped b.json (populated ${populatedAt[1]})`);
    expect(second.lines.at(-1)).toBe("[populate-all] Done: 0 populated, 2 skipped, 0 failed");
  });

  it("populates an edited file again and replaces its entry", async () => {
    const f = folder({ "a.json": "a1", "b.json": "b1" });
    await run(f);
    writeFileSync(path.join(f.dir, "b.json"), "b2");

    const second = await run(f, () => succeeded("poll-b", "refreshed"));
    expect(second.calls).toEqual([path.join(f.dir, "b.json")]);
    const entries = history(f).entries.filter((e) => e.file === "b.json");
    expect(entries).toHaveLength(1);
    expect(entries[0]!.outcome).toBe("refreshed");
  });

  it("populates every file again for another database", async () => {
    const f = folder({ "a.json": "a1", "b.json": "b1" });
    await run(f);
    const other = await run(f, () => succeeded(), { env: { ENV_DATABASE_URL: "postgres://dev:secret@other:5432/app02" } });
    expect(other.calls).toHaveLength(2);
    expect(history(f).entries).toHaveLength(4);
  });

  it("uses the project root's polldata when no folder is given", async () => {
    const f = folder({ "a.json": "a1" });
    const result = await run(f, () => succeeded(), { argv: [] });
    expect(result.calls).toEqual([path.join(f.dir, "a.json")]);
  });

  it("resolves a relative folder from INIT_CWD", async () => {
    const f = folder({ "a.json": "a1" });
    const result = await run(f, () => succeeded(), { argv: ["polldata"], env: { ENV_DATABASE_URL: DATABASE_URL, INIT_CWD: f.root } });
    expect(result.calls).toEqual([path.join(f.dir, "a.json")]);
  });

  it("says so and succeeds when the folder holds no .json file", async () => {
    const f = folder({ "a.har": "{}" });
    const result = await run(f);
    expect(result.code).toBe(0);
    expect(result.lines).toContain(`[populate-all] No .json files in ${f.dir}`);
    expect(existsSync(f.historyPath)).toBe(false);
  });

  it("records nothing for a failed file, goes on, and lists the failure at the end", async () => {
    const f = folder({ "a.json": "a1", "b.json": "b1" });
    const result = await run(f, (file) => (file.endsWith("b.json") ? failed("no user with the email x@example.com") : succeeded()));

    expect(result.code).toBe(1);
    expect(result.calls).toHaveLength(2);
    expect(result.errors).toEqual([
      "[populate-all] Error: b.json: no user with the email x@example.com",
      "[populate-all] Failed files:",
      "[populate-all]   b.json: no user with the email x@example.com"
    ]);
    expect(result.lines.at(-1)).toBe("[populate-all] Done: 1 populated, 0 skipped, 1 failed");
    expect(history(f).entries.map((e) => e.file)).toEqual(["a.json"]);

    const retry = await run(f);
    expect(retry.calls).toEqual([path.join(f.dir, "b.json")]);
    expect(retry.code).toBe(0);
  });

  it("does not record a successful run whose summary cannot be read", async () => {
    const f = folder({ "a.json": "a1" });
    const result = await run(f, () => ({ exitCode: 0, signal: null, stdout: "", stderr: "" }));
    expect(result.code).toBe(1);
    expect(result.errors[0]).toBe("[populate-all] Error: a.json: populated, but its summary could not be read");
    expect(existsSync(f.historyPath)).toBe(false);
  });

  describe("stops before any file", () => {
    async function refused(f: Folder, overrides: Parameters<typeof run>[2], line: string | RegExp): Promise<void> {
      const result = await run(f, () => succeeded(), overrides);
      expect(result.code).toBe(1);
      expect(result.calls).toEqual([]);
      expect(result.errors).toHaveLength(1);
      if (typeof line === "string") expect(result.errors[0]).toBe(line);
      else expect(result.errors[0]).toMatch(line);
    }

    it("on two arguments", async () => {
      await refused(folder({ "a.json": "a1" }), { argv: ["a", "b"] }, "[populate-all] Error: Usage: npm run populate-all-polls [<directory>]");
    });

    it("without a PostgreSQL ENV_DATABASE_URL", async () => {
      const line = "[populate-all] Error: ENV_DATABASE_URL is not set to a PostgreSQL URL";
      await refused(folder({ "a.json": "a1" }), { env: {} }, line);
      await refused(folder({ "a.json": "a1" }), { env: { ENV_DATABASE_URL: "mysql://u@h/db" } }, line);
    });

    it("on a missing folder", async () => {
      const f = folder({ "a.json": "a1" });
      await refused(f, { argv: [path.join(f.root, "nowhere")] }, /^\[populate-all\] Error: cannot read the directory .*nowhere: /);
    });

    it("on a missing default polldata", async () => {
      await refused(folder({ "a.json": "a1" }), { argv: [], projectRoot: tempDir() }, /^\[populate-all\] Error: cannot read the directory .*polldata: /);
    });

    it("on a history file that is not JSON", async () => {
      const f = folder({ "a.json": "a1" });
      writeFileSync(f.historyPath, "not json");
      await refused(f, {}, /^\[populate-all\] Error: cannot read .*history\.json: /);
    });

    it("on a history file without an entries list", async () => {
      const f = folder({ "a.json": "a1" });
      writeFileSync(f.historyPath, "{}");
      await refused(f, {}, /^\[populate-all\] Error: cannot read .*history\.json: /);
    });
  });
});

describe("populateAllPolls — with the real populate-poll.ts", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext();
    const now = new Date();
    await ctx.db
      .insertInto("user")
      .values({ id: "creator-1", name: "Creator One", userName: "Creator One", email: "creator@example.com", emailVerified: true, createdAt: now, updatedAt: now })
      .execute();
  });
  afterAll(async () => ctx.stop());

  it("creates the poll and records it", async () => {
    const f = folder({});
    copyFileSync(path.join(__dirname, "fixtures", "populate-poll.json"), path.join(f.dir, "fixture.json"));
    const childEnv: NodeJS.ProcessEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("ENV_")));
    Object.assign(childEnv, {
      ENV_DATABASE_URL: ctx.config.databaseUrl,
      ENV_BETTER_AUTH_SECRET: "vitest-harness-secret-0123456789-0123456789",
      ENV_PUBLIC_ORIGIN: "http://localhost:8080"
    });

    const code = await populateAllPolls({
      argv: [f.dir],
      env: childEnv,
      historyPath: f.historyPath,
      projectRoot: f.root,
      runPopulate: (file) => runPopulateChild(file, childEnv),
      log: () => {},
      logError: () => {}
    });

    expect(code).toBe(0);
    const polls = await ctx.db.selectFrom("polls").select(["id", "title"]).execute();
    expect(polls.map((p) => p.title)).toEqual(["Fixture Approval"]);
    const [entry] = history(f).entries;
    expect(entry).toMatchObject({ file: "fixture.json", pollId: polls[0]!.id, outcome: "created" });
  }, 120_000);
});
