import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { forgeSession, startTestContext, type TestContext } from "./helpers/setup.js";
import { makePoll, polls } from "./helpers/poll-fixtures.js";
import {
  NOTES_MAX,
  NOTES_PREVIEW_CHARS,
  normalizeNotes,
  notesPlainText,
  renderNotesHtml,
  renderNotesPreview
} from "../src/polls/notes.js";
import { projectPoll } from "../src/polls/versions.js";
import type { PollRow } from "../src/db/schema.js";

const cases: { stored: string; html: string }[] = JSON.parse(readFileSync("tests/fixtures/notes-cases.json", "utf8"));

describe("notes renderer", () => {
  it("has the limits of the spec", () => {
    expect(NOTES_MAX).toBe(6000);
    expect(NOTES_PREVIEW_CHARS).toBe(300);
  });

  it.each(cases)("renders the canonical case %j", ({ stored, html }) => {
    expect(renderNotesHtml(stored)).toBe(html);
  });

  it("reads a run of stars closing in either nesting", () => {
    expect(renderNotesHtml("***x***")).toBe("<strong><em>x</em></strong>");
    expect(renderNotesHtml("***x* y**")).toBe("<strong><em>x</em> y</strong>");
  });

  it("shows unbalanced marks as typed", () => {
    expect(renderNotesHtml("**open")).toBe("**open");
    expect(renderNotesHtml("close**")).toBe("close**");
    expect(renderNotesHtml("a *b")).toBe("a *b");
    expect(renderNotesHtml("++u and **b++ c**")).toBe("<u>u and **b</u> c**");
    expect(renderNotesHtml("1 + 1")).toBe("1 + 1");
    expect(renderNotesHtml("****")).toBe("****");
  });

  it("keeps a trailing backslash", () => {
    expect(renderNotesHtml("ends with \\")).toBe("ends with \\");
  });

  it.each([
    ["<script>alert(1)</script>", "&lt;script&gt;alert(1)&lt;/script&gt;"],
    ["<img src=x onerror=alert(1)>", "&lt;img src=x onerror=alert(1)&gt;"],
    ["javascript:alert(1)", "javascript:alert(1)"],
    ["https://example.com", "https://example.com"],
    ["**<b>bold</b>**", "<strong>&lt;b&gt;bold&lt;/b&gt;</strong>"],
    ["\" onmouseover=\"x", "&quot; onmouseover=&quot;x"],
    ["&amp; &#60;", "&amp;amp; &amp;#60;"]
  ])("shows %j as text", (stored, html) => {
    expect(renderNotesHtml(stored)).toBe(html);
  });

  it("gives the plain text without marks or escapes", () => {
    expect(notesPlainText("**a** *b* ++c++ \\* d\ne")).toBe("a b c * d\ne");
    expect(notesPlainText("**open")).toBe("**open");
  });

  it("stores whitespace-only notes as empty", () => {
    expect(normalizeNotes("  \n ** ** \n")).toBe("");
    expect(normalizeNotes("\n\n")).toBe("");
    expect(normalizeNotes(" kept ")).toBe(" kept ");
  });

  describe("preview", () => {
    it("is the whole rendering when the notes are short", () => {
      expect(renderNotesPreview("**short** notes")).toEqual({ html: "<strong>short</strong> notes", hasMore: false });
      expect(renderNotesPreview("")).toEqual({ html: "", hasMore: false });
    });

    it("cuts at a space, closes open marks and adds an ellipsis", () => {
      const words = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ");
      const preview = renderNotesPreview(`**${words}**`);
      expect(preview.hasMore).toBe(true);
      expect(preview.html.startsWith("<strong>word0 word1")).toBe(true);
      expect(preview.html.endsWith("</strong>…")).toBe(true);
      const text = preview.html.replace(/<[^>]+>/g, "").replace(/…$/, "");
      expect(text.length).toBeLessThanOrEqual(NOTES_PREVIEW_CHARS);
      expect(words.startsWith(text)).toBe(true);
      expect(words[text.length]).toBe(" ");
    });

    it("never splits an escape or a mark", () => {
      const long = "a ".repeat(140) + "\\* " + "**b** ".repeat(40);
      const preview = renderNotesPreview(long);
      expect(preview.hasMore).toBe(true);
      expect(preview.html).not.toMatch(/\\|\*\*/);
      expect(preview.html.match(/<strong>/g)?.length ?? 0).toBe(preview.html.match(/<\/strong>/g)?.length ?? 0);
    });

    it("escapes what it shows", () => {
      const preview = renderNotesPreview("<script>" + " x".repeat(200));
      expect(preview.html.startsWith("&lt;script&gt;")).toBe(true);
    });
  });
});

describe("notes through the admin API", () => {
  const ADMIN = "poll-notes-admin@example.com";
  let ctx: TestContext;
  let cookie = "";

  beforeAll(async () => {
    ctx = await startTestContext({ ENV_ADMINS: ADMIN });
    cookie = (await forgeSession(ctx, ADMIN)).cookie;
  });

  afterAll(async () => {
    await ctx.stop();
  });

  beforeEach(async () => {
    await polls(ctx).deleteMany({});
  });

  const save = (pid: string, body: Record<string, unknown>) =>
    request(ctx.app).post(`/api/admin/polls/${pid}/save`).set("Cookie", cookie).send({ clientGuid: "tab-1", ...body });
  const publish = (pid: string, body: Record<string, unknown>) =>
    request(ctx.app).post(`/api/admin/polls/${pid}/publish`).set("Cookie", cookie).send(body);
  const detail = (pid: string) => request(ctx.app).get(`/api/admin/polls/${pid}`).set("Cookie", cookie);

  async function draft() {
    const poll = makePoll({ pollState: "INITIALIZED" });
    await polls(ctx).insertOne(poll);
    expect((await request(ctx.app).post(`/api/admin/polls/${poll._id}/edit-session`).set("Cookie", cookie)
      .send({ clientGuid: "tab-1" })).status).toBe(200);
    return poll;
  }

  it("stores the notes sent with save and with publish", async () => {
    const saved = await draft();
    expect((await save(saved._id, { notes: "**Bring** a *plate*" })).status).toBe(200);
    expect((await polls(ctx).findOne({ _id: saved._id }))!.notes).toBe("**Bring** a *plate*");

    const published = makePoll({ pollState: "INITIALIZED" });
    await polls(ctx).insertOne(published);
    expect((await publish(published._id, { notes: "++Saturday++" })).status).toBe(200);
    expect((await polls(ctx).findOne({ _id: published._id }))!.notes).toBe("++Saturday++");
  });

  it("refuses more than 6000 characters and a value that is not text", async () => {
    const poll = await draft();
    expect((await save(poll._id, { notes: "x".repeat(6000) })).status).toBe(200);
    const tooLong = await save(poll._id, { notes: "x".repeat(6001) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error ?? tooLong.body.message).toBe("Notes must be at most 6000 characters.");
    expect((await save(poll._id, { notes: 12 })).status).toBe(400);
  });

  it("stores whitespace-only notes as empty", async () => {
    const poll = await draft();
    expect((await save(poll._id, { notes: " \n ** ** \n" })).status).toBe(200);
    expect((await polls(ctx).findOne({ _id: poll._id }))!.notes).toBe("");
  });

  it("gives the admin details the notes and their rendering, and list rows the preview only", async () => {
    const poll = makePoll({ notes: "**Bring** a <plate>" });
    await polls(ctx).insertOne(poll);
    const res = await detail(poll._id);
    expect(res.body).toMatchObject({ notes: "**Bring** a <plate>", notesHtml: "<strong>Bring</strong> a &lt;plate&gt;" });

    const list = await request(ctx.app).get("/api/admin/polls").set("Cookie", cookie);
    const row = list.body.polls.find((p: { pid: string }) => p.pid === poll._id);
    expect(row).toMatchObject({ notesPreviewHtml: "<strong>Bring</strong> a &lt;plate&gt;", hasMoreNotes: false });
    expect(row).not.toHaveProperty("notes");
    expect(row).not.toHaveProperty("notesHtml");
  });
});

describe("notes on the poll card", () => {
  const READER = "poll-notes-reader@example.com";
  let ctx: TestContext;
  let cookie = "";
  const long = "**Bring** " + Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ");

  beforeAll(async () => {
    ctx = await startTestContext({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "1" });
    cookie = (await forgeSession(ctx, READER)).cookie;
  });

  afterAll(async () => {
    await ctx.stop();
  });

  beforeEach(async () => {
    await polls(ctx).deleteMany({});
  });

  it("gives the projection the preview and whether there is more", () => {
    const row = { ...projectionRow(), notes: long };
    const projection = projectPoll(row);
    expect(projection.notesPreviewHtml).toBe(renderNotesPreview(long).html);
    expect(projection.hasMoreNotes).toBe(true);
    expect(projection).not.toHaveProperty("notes");
    expect(projection).not.toHaveProperty("notesHtml");
    const empty = projectPoll({ ...projectionRow(), notes: "" });
    expect([empty.notesPreviewHtml, empty.hasMoreNotes]).toEqual(["", false]);
  });

  it("puts the preview, not the whole notes, on listings and deltas", async () => {
    const poll = makePoll({ title: "Listed", notes: long });
    await polls(ctx).insertOne(poll);
    expect((await request(ctx.app).post(`/api/polls/${poll._id}/bookmark`).set("Cookie", cookie).send()).status).toBe(200);
    const tab = await request(ctx.app).post("/api/tabs/watching/refresh").set("Cookie", cookie).send({});
    const card = tab.body.cards[poll._id];
    expect(card.notesPreviewHtml).toBe(renderNotesPreview(long).html);
    expect(card.hasMoreNotes).toBe(true);
    expect(card).not.toHaveProperty("notesHtml");
    expect(card).not.toHaveProperty("notes");
  });

  it("gives the one-card routes the whole notes too, and still answers 404 for a poll the caller may not see", async () => {
    const pub = makePoll({ _id: randomUUID(), title: "Card", notes: long });
    const hidden = makePoll({ _id: randomUUID(), title: "Hidden", notes: "secret", pollVisibility: "Private Poll", pollSharingMode: "Invitation Only" });
    await polls(ctx).insertMany([pub, hidden]);

    const guest = await request(ctx.app).get(`/api/polls/${pub._id}/card`);
    expect(guest.status).toBe(200);
    expect(guest.body.poll).toMatchObject({
      notesPreviewHtml: renderNotesPreview(long).html,
      hasMoreNotes: true,
      notesHtml: renderNotesHtml(long)
    });
    const linked = await request(ctx.app).get(`/api/me/polls/${pub._id}`).set("Cookie", cookie);
    expect(linked.status).toBe(200);
    expect(linked.body.poll.notesHtml).toBe(renderNotesHtml(long));

    expect((await request(ctx.app).get(`/api/polls/${hidden._id}/card`)).status).toBe(404);
    expect((await request(ctx.app).get(`/api/me/polls/${hidden._id}`).set("Cookie", cookie)).status).toBe(404);
  });
});

function projectionRow(): PollRow {
  return {
    id: "p-notes",
    title: "Lunch",
    subtitle: "",
    notes: "",
    choice_mode: "Single-Choice Poll",
    vote_mutability: "Final-Vote Poll",
    poll_visibility: "Public Poll",
    poll_sharing_mode: "Anyone With The Link",
    poll_state: "OPEN",
    poll_state_before_edit_update: null,
    start_at: null,
    end_at: null,
    choices: [{ id: "c1", label: "Pizza", position: 0 }],
    content_version: 1,
    line_graph_enabled: false,
    voters_add_choices: false
  } as unknown as PollRow;
}
