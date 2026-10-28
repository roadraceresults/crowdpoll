import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { clearPolls, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import { cutToLength, up } from "../src/db/migrations/007-title-lengths.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext();
});

afterAll(async () => {
  await ctx.stop();
});

beforeEach(async () => {
  await clearPolls(ctx);
});

async function row(pid: string) {
  return sql<{ title: string; subtitle: string; content_version: string }>`
    select "title", "subtitle", "content_version" from "polls" where "id" = ${pid}`
    .execute(ctx.db)
    .then((r) => r.rows[0]!);
}

async function outbox() {
  return sql<{ poll_id: string; version: string; reason: string }>`
    select "poll_id", "version", "reason" from "search_outbox" order by "poll_id"`
    .execute(ctx.db)
    .then((r) => r.rows);
}

describe("migration 007: title and subtitle lengths", () => {
  it("cuts a title to 50 and a subtitle to 30 UTF-16 units, bumps the content version and queues a reindex", async () => {
    const long = makePoll({ title: "t".repeat(80), subtitle: "s".repeat(70) });
    const fine = makePoll({ title: "t".repeat(50), subtitle: "s".repeat(30) });
    await polls(ctx).insertMany([long, fine]);
    await sql`truncate table "search_outbox"`.execute(ctx.db);
    const before = await row(long._id);
    const fineBefore = await row(fine._id);

    await up(ctx.db);

    const after = await row(long._id);
    expect(after.title).toBe("t".repeat(50));
    expect(after.subtitle).toBe("s".repeat(30));
    expect(Number(after.content_version)).toBe(Number(before.content_version) + 1);
    expect(await row(fine._id)).toEqual(fineBefore);
    expect(await outbox()).toEqual([{ poll_id: long._id, version: after.content_version, reason: "content" }]);
  });

  it("counts an emoji as two units and never leaves half of one", async () => {
    const poll = makePoll({ title: "t".repeat(20) + "😀".repeat(20), subtitle: "s".repeat(29) + "😀" });
    await polls(ctx).insertOne(poll);

    await up(ctx.db);

    const after = await row(poll._id);
    expect(after.title).toBe("t".repeat(20) + "😀".repeat(15));
    expect(after.subtitle).toBe("s".repeat(29));
  });

  it("changes nothing on a second run", async () => {
    const poll = makePoll({ title: "t".repeat(80) });
    await polls(ctx).insertOne(poll);
    await up(ctx.db);
    const once = await row(poll._id);
    await up(ctx.db);
    expect(await row(poll._id)).toEqual(once);
  });

  it("cutToLength drops a high surrogate left at the cut", () => {
    expect(cutToLength("ab😀", 3)).toBe("ab");
    expect(cutToLength("ab😀", 4)).toBe("ab😀");
    expect(cutToLength("abc", 5)).toBe("abc");
  });
});
