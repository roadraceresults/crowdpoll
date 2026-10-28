/**
 * 011-SIMPLIFY-POLL-STATES — US1/US2 eligibility (FR-006, FR-007, FR-008).
 *
 * The crux is FR-007: a vote that was later deleted, or removed by banning its
 * voter, still counts. Full editing is refused forever after the first vote.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { startTestContext, forgeSession, type TestContext } from "./helpers/setup.js";
import { readFileSync } from "node:fs";
import { makePoll } from "./helpers/poll-fixtures.js";
import { polls, voteHistory } from "./helpers/poll-fixtures.js";
import { type PollState } from "../src/polls/store.js";
import { editModeFor, canEditPoll, canUpdatePoll, hasEverBeenVotedOn } from "../src/polls/service.js";

describe("editModeFor (011 FR-006/FR-008)", () => {
  const eligible: PollState[] = ["INITIALIZED", "REJECTED", "WAITING TO OPEN", "OPEN", "CLOSED"];

  it("offers EDIT for a never-voted poll in every eligible state", () => {
    for (const pollState of eligible) {
      expect(editModeFor({ pollState }, false)).toEqual({ mode: "EDIT" });
      expect(canEditPoll({ pollState }, false)).toBe(true);
      expect(canUpdatePoll({ pollState }, false)).toBe(false);
    }
  });

  it("offers UPDATE, never EDIT, once the poll has ever been voted on", () => {
    for (const pollState of eligible) {
      expect(editModeFor({ pollState }, true)).toEqual({ mode: "UPDATE" });
      expect(canEditPoll({ pollState }, true)).toBe(false);
      expect(canUpdatePoll({ pollState }, true)).toBe(true);
    }
  });

  it("refuses an EDITING poll as locked, with the documented message", () => {
    const r = editModeFor({ pollState: "EDITING" }, false);
    expect(r).toHaveProperty("refusal", "LOCKED");
    expect((r as { message: string }).message).toMatch(/currently being edited.*try again shortly/i);
  });

  it("refuses AWAITING APPROVAL and ARCHIVED as ineligible", () => {
    for (const pollState of ["AWAITING APPROVAL", "ARCHIVED"] as PollState[]) {
      const r = editModeFor({ pollState }, false);
      expect(r).toHaveProperty("refusal", "INELIGIBLE");
    }
  });
});

describe("hasEverBeenVotedOn (011 FR-007)", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext();
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await polls(ctx).deleteMany({});
    await voteHistory(ctx).deleteMany({});
  });

  it("is false for a poll that has never been voted on", async () => {
    const poll = makePoll();
    await polls(ctx).insertOne(poll);
    expect(await hasEverBeenVotedOn(ctx.db, poll._id)).toBe(false);
  });

  it("stays true after the vote is deleted — a deleted vote still counts", async () => {
    const poll = makePoll({
      currentVotes: [
        { emailAddress: "v@x.com", userName: "v", choiceIds: ["c1"], votedAt: new Date() }
      ]
    });
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({
      pid: poll._id,
      emailAddress: "v@x.com",
      userName: "v",
      choiceIds: ["c1"],
      votedAt: new Date()
    });
    expect(await hasEverBeenVotedOn(ctx.db, poll._id)).toBe(true);

    // The admin deletes the vote outright (011 FR-055) — no marker is left behind.
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { currentVotes: [] } });
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after!.currentVotes).toHaveLength(0);

    // ...and the poll is still permanently on the update surface.
    expect(await hasEverBeenVotedOn(ctx.db, poll._id)).toBe(true);
    expect(canEditPoll({ pollState: "OPEN" }, true)).toBe(false);
    expect(canUpdatePoll({ pollState: "OPEN" }, true)).toBe(true);
  });

  it("is answered from history, not from currentVotes", async () => {
    // A pre-seeded invitation row is not a vote.
    const poll = makePoll({
      currentVotes: [
        { emailAddress: "invited@x.com", userName: "", choiceIds: [], votedAt: null }
      ]
    });
    await polls(ctx).insertOne(poll);
    expect(await hasEverBeenVotedOn(ctx.db, poll._id)).toBe(false);
  });
});

describe("POST /api/admin/polls/:pid/edit-session (011 T020)", () => {
  let ctx: TestContext;
  let cookie: string;
  beforeAll(async () => {
    ctx = await startTestContext();
    ({ cookie } = await forgeSession(ctx, ctx.config.admins[0]!));
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await polls(ctx).deleteMany({});
    await voteHistory(ctx).deleteMany({});
  });

  async function session(pid: string) {
    return request(ctx.app)
      .post(`/api/admin/polls/${pid}/edit-session`)
      .set("Cookie", cookie)
      .send({ clientGuid: "tab-1" });
  }

  it("grants EDIT for a poll that has never been voted on", async () => {
    const poll = makePoll({ pollState: "INITIALIZED" });
    await polls(ctx).insertOne(poll);
    const res = await session(poll._id);
    expect(res.status).toBe(200);
    expect(res.body.granted).toBe(true);
    expect(res.body.mode).toBe("EDIT");
  });

  it("grants UPDATE once the poll has been voted on, and still does after the vote is deleted", async () => {
    const poll = makePoll({ pollState: "OPEN" });
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({
      pid: poll._id, emailAddress: "v@x.com", userName: "v", choiceIds: ["c1"], votedAt: new Date()
    });
    await polls(ctx).updateOne({ _id: poll._id }, { $set: { currentVotes: [] } });
    const res = await session(poll._id);
    expect(res.status).toBe(200);
    expect(res.body.mode).toBe("UPDATE");
  });

  it("refuses a locked poll with the documented message and changes nothing (FR-019)", async () => {
    const poll = makePoll({ pollState: "EDITING", pollEditUpdateClientGUID: "other-tab" });
    await polls(ctx).insertOne(poll);
    const res = await session(poll._id);
    expect(res.status).toBe(409);
    expect(res.body.granted).toBe(false);
    expect(res.body.reason).toBe("LOCKED");
    expect(res.body.message).toMatch(/try again shortly/i);
    const after = await polls(ctx).findOne({ _id: poll._id });
    expect(after!.pollEditUpdateClientGUID).toBe("other-tab");
    expect(after!.pollState).toBe("EDITING");
  });

  it("refuses AWAITING APPROVAL and ARCHIVED", async () => {
    for (const st of ["AWAITING APPROVAL", "ARCHIVED"] as const) {
      const poll = makePoll({ pollState: st });
      await polls(ctx).insertOne(poll);
      const res = await session(poll._id);
      expect(res.status).toBe(409);
      expect(res.body.reason).toBe("INELIGIBLE");
    }
  });

  it("refuses a choices save once the poll has ever been voted on (FR-010)", async () => {
    const poll = makePoll({ pollState: "OPEN" });
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({
      pid: poll._id, emailAddress: "v@x.com", userName: "v", choiceIds: ["c1"], votedAt: new Date()
    });
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ labels: ["A", "B"] });
    // 012 T050: the refusal moved from the deleted PUT …/choices route (409) into the
    // publish handler's UPDATE-mode field check (400). Choices remain immutable once
    // a poll has been voted on — only the shape of the refusal changed.
    expect(res.status).toBe(400);
    // 012 FR-059 widened this whitelist to include the participant lists, so the
    // assertion pins the part that matters: choices are refused on the update surface.
    expect(res.body.error).toMatch(/this poll has votes/i);
    expect(res.body.error).not.toMatch(/labels/);
  });
});

/*
 * 014 FR-004: /admin/poll and /admin/poll/update are removed. Editing happens on
 * the card, so there is no surface to serve and no redirect between two of them.
 * The eligibility rules those routes consulted are unchanged and are still
 * enforced by POST /api/admin/polls/:pid/edit-session, covered below.
 */

describe("Explicit publish replaces autosave (011 FR-012, FR-013, FR-030)", () => {
  const html = readFileSync("src/public/admin.html", "utf8");
  const js = readFileSync("src/public/adminCard.js", "utf8");

  // The editing face's Save and Publish / Cancel bar was replaced by the wizard's
  // footers (Cancel / Save / Publish, and Cancel / Save changes); their availability
  // is covered in client-admin-wizard.test.ts.
  it("keeps the back link, and publishes only from the wizard's footers", () => {
    expect(html).toContain("admin-back-link");
    expect(js).toContain('el("button", "btn-header-primary", "Publish")');
    expect(js).toContain('el("button", "btn-header-primary", "Save changes")');
  });

  it("has no autosave left — nothing PATCHes a field (FR-012)", () => {
    expect(js).not.toContain("wireAutosaveField");
    expect(js).not.toContain("patchPoll");
    expect(js).not.toContain('method: "PATCH"');
  });

  it("publishes with one request carrying the wizard's fields", () => {
    expect(js).toContain('postWizard("/publish")');
    expect(js).toContain('postWizard("/save")');
  });

  it("shows the rejection reason beside State when the poll is REJECTED (FR-030)", () => {
    expect(js).toMatch(/poll\.pollState === "REJECTED"\) return poll\.pollRejectionReason/);
    expect(js).toContain("card-state-detail");
  });
});

describe("Editing surfaces prevent an inverted schedule (011 FR-047, T055)", () => {
  const js = readFileSync("src/public/adminCard.js", "utf8");

  it("checks the schedule in one place, for Step 5 and both footers", () => {
    expect(js).toContain("function scheduleProblem");
    expect(js.match(/scheduleProblem\(\)/g)!.length).toBeGreaterThanOrEqual(3);
  });

  it("blocks publishing and explains why when start is not before end", () => {
    expect(js).toContain('if (start && end && start >= end) return "Start must be before End.";');
  });
});

describe("Client heartbeat and release (011 T064/T065)", () => {
  const js = readFileSync("src/public/adminCard.js", "utf8");

  it("generates a fresh identifier per page load, so a refresh is not re-entrant (FR-023)", () => {
    expect(js).toMatch(/const clientGuid =/);
    expect(js).toMatch(/randomUUID/);
  });

  it("starts beating once a session is granted, on its own interval (FR-020)", () => {
    expect(js).toContain("startHeartbeat()");
    expect(js).toMatch(/setInterval\(sendHeartbeat, HEARTBEAT_INTERVAL_MS\)/);
    expect(js).toContain("/edit-session/heartbeat");
  });

  // 014: a lost session returns the card to read-only in place. There is no page
  // to navigate away from any more, and nothing to release - the session has
  // already ended elsewhere.
  it("stops and steps down on a non-alive answer, writing nothing (FR-020, FR-023)", () => {
    const fn = js.slice(js.indexOf("async function sendHeartbeat"), js.indexOf("function startHeartbeat"));
    expect(fn).toContain("loseSession()");
    const lose = js.slice(js.indexOf("function loseSession"), js.indexOf("function update(nextPoll)"));
    expect(lose).toContain("stopHeartbeat()");
    expect(lose).toContain("renderReadOnly()");
    expect(lose).toContain("no longer being edited in this tab");
    // It must not try to release a lock it no longer holds.
    expect(lose).not.toContain("method: \"DELETE\"");
  });

  it("does not treat a transient network failure as a lost session", () => {
    const fn = js.slice(js.indexOf("async function sendHeartbeat"), js.indexOf("function startHeartbeat"));
    expect(fn).toMatch(/catch\s*\{[\s\S]*?return;/);
  });

  it("releases the session when leaving cleanly, so the poll frees immediately", () => {
    expect(js).toContain("async function releaseSession");
    expect(js).toMatch(/method: "DELETE"/);
    expect(js).toMatch(/await releaseSession\(\)/);
  });

  // 014 FR-022: the invariant the session rule rests on.
  it("holds no session in read-only form - every voluntary exit releases it", () => {
    const leave = js.slice(js.indexOf("function leaveWizard"), js.indexOf("async function postWizard"));
    const cancel = js.slice(js.indexOf("async function cancelWizard"), js.indexOf("// ── read-only face"));
    expect(leave).toContain("resetEditState()");
    expect(cancel).toContain("await releaseSession()");
    expect(cancel).toContain("leaveWizard()");
    for (const exit of ["async function saveWizard", "async function publishWizard", "async function saveChanges"]) {
      expect(js.slice(js.indexOf(exit), js.indexOf(exit) + 1200), exit).toContain("leaveWizard()");
    }
    const reset = js.slice(js.indexOf("function resetEditState"), js.indexOf("function focusSummary"));
    expect(reset).toContain('mode = "READ_ONLY"');
    expect(reset).toContain("stopHeartbeat()");
  });
});

describe("Every exit route warns (011 FR-014, FR-016, T067-T070)", () => {
  const js = readFileSync("src/public/adminCard.js", "utf8");
  const listJs = readFileSync("src/public/adminList.js", "utf8");

  it("warns on Cancel and on the Back Arrow, and only when there is something to lose", () => {
    expect(js).toContain("function confirmDiscard");
    expect(js).toContain('"Discard changes?"');
    expect(js).toContain('"Your edits will be lost."');
    expect(js).not.toContain("window.confirm");
    expect(js).toMatch(/cancel\.addEventListener\("click", async[\s\S]{0,120}await confirmDiscard\(\)/);
    expect(listJs).toMatch(/function guardNavigation[\s\S]{0,1200}await controller\.confirmDiscard\(\)/);
  });

  // 025 FIX10: one listener covers the back arrow and every other link within the site.
  it("intercepts any same-site link rather than letting it navigate (FR-016)", () => {
    expect(listJs).toMatch(/document\.addEventListener\("click", async \(event\) => \{[\s\S]{0,700}url\.origin !== window\.location\.origin[\s\S]{0,200}event\.preventDefault\(\)[\s\S]{0,80}await controller\.confirmDiscard/);
  });

  it("releases the session, and with it the beforeunload guard, before leaving by a link", () => {
    const guard = listJs.slice(listJs.indexOf("function guardNavigation"));
    expect(guard.slice(0, 1400)).toContain("releaseSession()");
    const release = js.slice(js.indexOf("async function releaseSession"));
    expect(release.slice(0, 200)).toContain("disarmExitGuards()");
  });

  it("arms beforeunload on the first edit, not on load", () => {
    expect(js).toContain("armExitGuards()");
    const mark = js.slice(js.indexOf("function syncWizardDirty"), js.indexOf("function syncWizardDirty") + 300);
    expect(mark).toContain("if (dirty) armExitGuards();");
    expect(js).toMatch(/addEventListener\("beforeunload", onBeforeUnload\)/);
  });

  /*
   * 014: the history-entry guard is gone. It existed so the browser Back button
   * could be intercepted on a dedicated edit page; a card never navigates, so
   * there is no history entry to defend and pushing one would corrupt the real
   * back button on /admin.
   */
  it("pushes no history entry, because editing no longer navigates", () => {
    expect(js).not.toContain("history.pushState");
    expect(js).not.toContain("popstate");
  });

  it("does not prompt after saving - that is a save, not a discard", () => {
    const leave = js.slice(js.indexOf("function leaveWizard"), js.indexOf("async function postWizard"));
    expect(leave).toContain("resetEditState()");
    const reset = js.slice(js.indexOf("function resetEditState"), js.indexOf("function focusSummary"));
    expect(reset).toContain("dirty = false");
    expect(reset).toContain("disarmExitGuards()");
  });

  it("leaves the card in place, never by browser history (FR-016)", () => {
    expect(js).not.toMatch(/history\.back\(\)/);
    expect(js).not.toMatch(/window\.location\.assign\("\/admin"\)/);
  });
});

describe("Admin list refreshes in place (011 T085/T086/T087)", () => {
  const js = readFileSync("src/public/adminList.js", "utf8");
  const cardJs = readFileSync("src/public/adminCard.js", "utf8");
  const html = readFileSync("src/public/admin.html", "utf8");

  it("refreshes on its own configured interval (FR-048, FR-059)", () => {
    expect(js).toContain("startAutoRefresh");
    expect(js).toMatch(/pollAdminPageRefreshIntervalMs/);
    expect(js).toMatch(/setInterval\([\s\S]{0,60}loadList\(\{ preserve: true \}\)/);
  });

  it("keeps an open action menu open and holds the scroll position", () => {
    const fn = js.slice(js.indexOf("async function loadList"), js.indexOf("async function startAutoRefresh"));
    expect(fn).toContain("openPid");
    expect(fn).toContain("window.scrollY");
    expect(fn).toContain("window.scrollTo");
    // A preserving refresh must not slam the menu shut.
    expect(fn).toMatch(/if \(!preserve\) closeMenu\(\)/);
  });

  it("never reloads the page to refresh", () => {
    expect(js).not.toMatch(/location\.reload/);
  });

  // 012 FR-033/FR-036 supersede 011 here. `Waiting` and `Rejection reason` stop being
  // columns of their own — they are rare enough that a column each was mostly empty
  // space — and stack into the title block instead. The elapsed-time calculation and
  // the rejection text are unchanged; only where they render moved.
  it("012 FR-033: Waiting and Rejection reason are no longer columns", () => {
    expect(html).not.toContain("<th>Waiting</th>");
    expect(html).not.toContain("<th>Rejection reason</th>");
    expect(html).not.toContain("<th>Subtitle</th>");
  });

  // 014: the card carries the same two pieces of state detail beside State, from
  // the same data. Only the element they render into moved.
  it("012 FR-036: both render from the same data, now on the card", () => {
    expect(cardJs).toContain("function stateDetailText");
    expect(cardJs).toContain("function elapsedSinceApproval");
    // The detail carries only what the State value does not already say: the
    // elapsed time while screening, the reason once rejected.
    expect(cardJs).toMatch(/poll\.pollState === "AWAITING APPROVAL"\) return elapsedSinceApproval\(poll, now\)/);
    expect(cardJs).toMatch(/poll\.pollState === "REJECTED"\) return poll\.pollRejectionReason/);
    expect(cardJs).not.toMatch(/"AWAITING APPROVAL — "|"REJECTED: "/);
  });

  it("renders the menu from the server's booleans rather than re-deriving rules", () => {
    expect(cardJs).toMatch(/current\.canRescreen/);
  });
});

describe("Action menu is rendered from the server's booleans (011 T095/T096)", () => {
  const js = readFileSync("src/public/adminList.js", "utf8");
  const cardJs = readFileSync("src/public/adminCard.js", "utf8");

  // 014 FR-004: the Edit Poll / Update Poll menu item is gone. The Settings Summary's
  // links open the editor in its place (there is no pen), gated by the same pair of
  // booleans that used to gate the item.
  it("opens the editor from the Settings Summary, gated by the same booleans", () => {
    expect(cardJs).toMatch(/function canOpenEditor\(\) \{\s*return \(current\.canEdit \|\| current\.canUpdate\)/);
    expect(cardJs).not.toContain("icon-pen");
    expect(cardJs).not.toContain("Update Poll");
    expect(cardJs).not.toContain("Edit Poll");
  });

  it("gates archive, delete and re-screen on their own booleans", () => {
    expect(cardJs).toMatch(/if \(current\.canRescreen\)/);
    expect(cardJs).toMatch(/if \(current\.canArchive\)/);
    expect(cardJs).toMatch(/if \(current\.canDelete\)/);
  });

  it("confirms before deleting and before archiving — both are irreversible", () => {
    expect(js).toMatch(/Are you sure you want to delete this poll\?/);
    expect(js).toMatch(/Archive this poll\? This cannot be undone\./);
  });

  it("does not re-derive the action rules client-side", () => {
    // No state-name comparisons deciding what to offer.
    for (const source of [js, cardJs]) {
      expect(source).not.toMatch(/pollState === "ARCHIVED"/);
      expect(source).not.toMatch(/pollState === "INITIALIZED"/);
    }
  });
});

describe("UPDATE-mode publish rejects fields it may not change (011 FR-009, T030)", () => {
  let ctx: TestContext;
  let cookie: string;
  beforeAll(async () => {
    ctx = await startTestContext();
    ({ cookie } = await forgeSession(ctx, ctx.config.admins[0]!));
  });
  afterAll(async () => {
    await ctx.stop();
  });
  beforeEach(async () => {
    await polls(ctx).deleteMany({});
    await voteHistory(ctx).deleteMany({});
  });

  async function votedSession() {
    const poll = makePoll({ pollState: "OPEN" });
    await polls(ctx).insertOne(poll);
    await voteHistory(ctx).insertOne({
      pid: poll._id, emailAddress: "v@x.com", userName: "v", choiceIds: ["c1"], votedAt: new Date()
    });
    await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/edit-session`)
      .set("Cookie", cookie)
      .send({ clientGuid: "tab-A" });
    return poll;
  }

  it("accepts the four permitted fields", async () => {
    const poll = await votedSession();
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({
        clientGuid: "tab-A",
        title: "New title",
        subtitle: "New subtitle",
        startAt: null,
        endAt: new Date(Date.now() + 3_600_000).toISOString()
      });
    expect(res.status).toBe(200);
  });

  it("rejects every field outside them with 400, naming what is allowed", async () => {
    // 012 FR-064 removed voterCountLimit from this list: it is capacity rather than
    // mechanics, so it stays editable once a poll has votes. The three that remain all
    // change what an existing vote *means*, which is why they are frozen (012 FR-004).
    for (const field of ["choiceMode", "pollVisibility", "voteMutability"]) {
      await polls(ctx).deleteMany({});
      await voteHistory(ctx).deleteMany({});
      const poll = await votedSession();
      const res = await request(ctx.app)
        .post(`/api/admin/polls/${poll._id}/publish`)
        .set("Cookie", cookie)
        .send({ clientGuid: "tab-A", [field]: "anything" });
      expect(res.status, field).toBe(400);
      expect(res.body.error).toMatch(/only title, subtitle, startAt, endAt/i);
    }
  });

  it("allows those same fields on a poll that has never been voted on", async () => {
    const poll = makePoll({ pollState: "INITIALIZED" });
    await polls(ctx).insertOne(poll);
    await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/edit-session`)
      .set("Cookie", cookie)
      .send({ clientGuid: "tab-B" });
    const res = await request(ctx.app)
      .post(`/api/admin/polls/${poll._id}/publish`)
      .set("Cookie", cookie)
      .send({ clientGuid: "tab-B", choiceMode: "Multiple-Choice Poll" });
    expect(res.status).toBe(200);
  });
});
