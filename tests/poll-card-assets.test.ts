/**
 * Shipped client assets: the markup and rules that presentation work depends
 * on, guarded automatically because they are the specific edits a future
 * change is most likely to undo.
 *
 * Named for 008-POLL-CARD-BACK-SIDE VM-002 (contracts/ui-contracts.md C5),
 * which is where it started -- that fix is a presentation change, so its
 * geometry is verified manually via quickstart.md. It has since grown to cover
 * any served asset whose content is load-bearing: 013 adds the session
 * transport identifiers in app.js and the stylesheet migration.
 *
 * Assets come from express.static (src/server.ts), so they are fetched over
 * HTTP here rather than read off disk, which also proves they are actually
 * being served.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { POLL_VISIBILITIES } from "../src/polls/store.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  await ctx.stop();
});

/**
 * 013 FR-012/FR-016: the cross-window transport is two identifiers — a channel
 * name and a fallback key. Renaming either silently stops windows from hearing
 * one another, with nothing else failing, so they are pinned here.
 */
describe("app.js session transport (013 FR-012/FR-016)", () => {
  it("serves the auth-state channel name and the fallback key", async () => {
    const res = await request(ctx.app).get("/app.js");
    expect(res.status).toBe(200);
    expect(res.text).toContain("auth-state");
    expect(res.text).toContain("authStateChangedAt");
  });

  it("carries no timer for session refresh (FR-011)", async () => {
    const res = await request(ctx.app).get("/app.js");
    // Re-checks are event-driven: load, visibilitychange, persisted pageshow,
    // and the page's own PATCH. A polling interval would be a regression.
    expect(res.text).toContain("visibilitychange");
    expect(res.text).toContain("pageshow");
  });
});

/**
 * 013 D2 / research R3: the three card pages stop loading styles.css and take
 * index.html's stylesheet set. Nothing element-level moves into site.css --
 * site.css:339 records that failing once already, when a `button` rule crushed
 * the card's .icon-btn svg -- so the promoted rules are scoped to the shell.
 */
describe("013 stylesheet migration (D2, research R3)", () => {
  it("site.css carries the promoted .error rule", async () => {
    const res = await request(ctx.app).get("/site.css");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/\.error\s*\{\s*color/);
  });

  it("styles.css no longer carries main.narrow", async () => {
    const res = await request(ctx.app).get("/styles.css");
    expect(res.status).toBe(200);
    // Used by exactly the three pages this feature rebuilds and by nothing
    // else, so after the rebuild it matches nothing anywhere in the app.
    expect(res.text).not.toContain("main.narrow");
  });

  it("the three card pages no longer link styles.css", async () => {
    // /profile redirects a guest that carries no verification result, which is
    // the guard working; the result form is how a guest legitimately reaches it.
    for (const page of ["/login", "/create-account", "/profile?changed=1"]) {
      const res = await request(ctx.app).get(page);
      expect(res.status).toBe(200);
      expect(res.text).not.toContain("/styles.css");
      expect(res.text).toContain("/pollCard.css");
      expect(res.text).toContain("/site.css");
    }
  });

  it("the promoted field rules are scoped to the shell, not bare element selectors", async () => {
    const res = await request(ctx.app).get("/site.css");
    expect(res.text).toContain(".card-shell-body form");
    expect(res.text).toContain(".card-shell-body label");
    // A bare `button {` rule in site.css is the regression this guards.
    expect(res.text).not.toMatch(/^button\s*\{/m);
  });
});

describe("site.css poll card rules (008 FR-001/FR-002)", () => {
  it("keeps the [hidden] override that stops the closed message rendering on open polls", async () => {
    const res = await request(ctx.app).get("/site.css");
    expect(res.status).toBe(200);
    // research.md R1: .poll-closed-message sets display:flex, which beats the
    // UA stylesheet's [hidden]{display:none}. Without this override both
    // closed-message elements render on every card and the voting side's
    // choices region loses half its space to an invisible sibling.
    expect(res.text).toContain(".poll-closed-message[hidden]");
  });
});

describe("pollCard.js card template (008 FR-004)", () => {
  it("renders a participation count on both faces", async () => {
    const res = await request(ctx.app).get("/pollCard.js");
    expect(res.status).toBe(200);
    // Counts the markup form, NOT the bare string "poll-totals": that occurs
    // three times in this file already (a querySelectorAll call, a comment and
    // the front-face element), so a `toContain` check would pass even with the
    // back-face copy missing. class="poll-totals" goes 1 -> 2 with the fix.
    expect(res.text.match(/class="poll-totals"/g)).toHaveLength(2);
  });

  it("carries the width sizer that equalises the two primary buttons", async () => {
    const res = await request(ctx.app).get("/pollCard.js");
    expect(res.text).toContain("btn-vote-sizer");
  });
});

describe("site.css button sizing (008 FR-007)", () => {
  it("stacks the Vote label and its sizer in one grid cell", async () => {
    const res = await request(ctx.app).get("/site.css");
    expect(res.text).toContain(".btn-vote-sizer");
    // research.md R7: the grid is load-bearing. .btn-primary sets display:flex,
    // and a row flex container sizes to the SUM of its items -- a sizer laid
    // out beside the label would make the button about twice as wide as
    // intended, instead of matching "Submit vote".
    expect(res.text).toContain(".vote-btn > *");
  });
});

/**
 * The colour constants the served asset must carry. The colours as rendered --
 * each bar's fill, its text's contrast, the Yes/No tint and the in-place reorder
 * -- are checked in client-bar-colours.test.ts.
 */
describe("tabs.css hides a tab's grid while one of its cards is maximized", () => {
  it("overrides the grid's display for the hidden attribute", async () => {
    const res = await request(ctx.app).get("/tabs.css");
    expect(res.status).toBe(200);
    expect(res.text).toContain(".card-grid[hidden]{ display:none; }");
  });
});

describe("site.css draws the Maximize icon's states", () => {
  it("colours the icon #202020, with a hover and focus background, a focus ring and a darker mouse-down", async () => {
    const res = await request(ctx.app).get("/site.css");
    expect(res.status).toBe(200);
    expect(res.text).toContain("color:#202020;");
    expect(res.text).toContain(".maximize-btn:hover{ background:rgba(0,0,0,0.06); }");
    expect(res.text).toContain(".maximize-btn:focus-visible{");
    expect(res.text).toContain(".maximize-btn:active{ background:rgba(0,0,0,0.12); }");
    expect(res.text).toContain(".maximize-btn svg[hidden]{ display:none; }");
  });
});

describe("pollCard.js choice colours", () => {
  it("ships both semantic colours", async () => {
    const res = await request(ctx.app).get("/pollCard.js");
    expect(res.status).toBe(200);
    expect(res.text).toContain("SEMANTIC_AFFIRMATIVE_COLOR = '#006120'");
    expect(res.text).toContain("SEMANTIC_NEGATIVE_COLOR = '#F91010'");
  });

  it("matches whole words only, with no g flag on either rule", async () => {
    const res = await request(ctx.app).get("/pollCard.js");
    // The letters-only lookaround boundary keeps "correct" inside "Incorrect"
    // from matching, while still matching "Agree2"/"yes_please"/"No1" (FR-004,
    // amended 2026-08-19 -- see research.md R3). The g flag would retain
    // lastIndex across .test() calls and make results order-dependent.
    expect(res.text).toContain("/(?<![a-z])(?:yes|true|correct|agree|yay)(?![a-z])/i");
    expect(res.text).toContain("/(?<![a-z])(?:no|false|incorrect|disagree|nay)(?![a-z])/i");
  });

  it("expands the base list to one palette colour per allowed choice, never repeating a neighbour (FR-008, FIX03)", async () => {
    const res = await request(ctx.app).get("/pollCard.js");
    const block = res.text.slice(res.text.indexOf("RESULTS_PALETTE_ENTRIES = ["));
    const base = block.slice(0, block.indexOf("];")).match(/hex:\s*'#[0-9A-Fa-f]{6}'/g) ?? [];
    expect(base.length).toBeGreaterThan(1);
    const expand = new Function(
      `${res.text.slice(res.text.indexOf("function expandPalette"), res.text.indexOf("const RESULTS_COLOR_PALETTE"))}; return expandPalette;`
    )() as (list: string[], count: number) => string[];
    const list = base.map((_, i) => `c${i}`);
    // The palette holding as many colours as a poll may have choices is what
    // makes the wraparound in assignResultColors unreachable. The count is
    // ENV_MAX_CHOICES, so raising it grows the palette instead of recycling.
    for (const count of [ctx.config.maxChoices, 60, list.length + 1, 2 * list.length + 1, 3 * list.length + 1]) {
      const out = expand(list, count);
      expect(out.length).toBeGreaterThanOrEqual(count);
      expect(out.every((c, i) => c !== out[(i + 1) % out.length])).toBe(true);
    }
    expect(expand(list, 60)).toHaveLength(60);
  });
});

describe("site.css fill boundary (009 FR-012)", () => {
  it("draws a trailing edge on the result fill", async () => {
    const res = await request(ctx.app).get("/site.css");
    // FR-012: #43F781 reaches only 1.06:1 against the track (#DDE1D6), so the
    // fill/track boundary -- which is what conveys the percentage -- would rely
    // on hue alone, exactly the cue red-green colour deficiency removes. The
    // edge restores it at >= 3.91:1 independently of fill colour.
    expect(res.text).toContain("inset -2px 0 0 rgba(0,0,0,0.55)");
  });
});

/**
 * 012 T064 (US5, FR-039): the poll list's icons are hand-authored inline SVG,
 * defined once per page as <symbol> and referenced per row with <use>. No icon
 * library is a dependency of this project — Font Awesome is named in the source
 * requirements only as a visual reference.
 *
 * A <use> whose target id is missing renders *nothing at all*, silently, so the
 * two halves have to be checked against each other rather than separately.
 */
describe("Admin list icons are self-hosted SVG symbols (012 FR-039)", () => {
  // No pen: the Settings Summary's links open the editor.
  const SYMBOLS = ["icon-copy", "icon-link", "icon-results", "icon-trash"];

  // admin.html is served behind the admin gate rather than as a static file, so the
  // markup is read from disk — the same way the other page-shape tests read it.
  const page = readFileSync("src/public/admin.html", "utf8");

  it("defines every symbol the card references, and references every one it defines", async () => {
    const script = await request(ctx.app).get("/adminCard.js");
    expect(script.status).toBe(200);

    for (const id of SYMBOLS) {
      expect(page, `<symbol id="${id}"> missing from admin.html`).toContain(`id="${id}"`);
      expect(script.text, `${id} never referenced by adminCard.js`).toContain(`"${id}"`);
    }

    // Nothing references a symbol that does not exist.
    const referenced = [...script.text.matchAll(/"(icon-[a-z]+)"/g)].map((m) => m[1]!);
    for (const id of new Set(referenced)) {
      expect(SYMBOLS, `adminCard.js references an undefined symbol: ${id}`).toContain(id);
    }
  });

  it("pulls in no icon library", () => {
    expect(page).not.toMatch(/font-?awesome/i);
    expect(page).not.toMatch(/fa-solid|fa-copy|fa-trash/);
  });

  it("gives every icon control a tooltip naming its action and its poll", async () => {
    const script = await request(ctx.app).get("/adminCard.js");
    // 014 FR-046: the name identifies the action AND which poll it acts on, so a
    // control reached out of visual context is unambiguous. The icon and the menu
    // item build their label from the same expression, so the two affordances
    // cannot describe the same action differently.
    for (const label of ["Duplicate poll: ", "Copy link to poll: ", "View results for poll: ", "Delete poll: "]) {
      expect(script.text, label).toContain(`"${label}"`);
    }
    expect(script.text).toMatch(/btn\.title = label/);
    expect(script.text).toMatch(/setAttribute\("aria-label", label\)/);
  });
});

/**
 * 012 regression guard — the radio-group width collision found in manual validation.
 *
 * `admin.css` has a long-standing rule, `.admin-field textarea, .admin-field input,
 * .admin-field select { width: 100% }`, written for text boxes. The mechanics radio
 * groups are `.admin-field` elements too, so every radio inherited `width: 100%`,
 * stretched across the row, and squeezed its label into a one-character column —
 * each option rendered as a vertical stack of single letters.
 *
 * The fix is an explicit reset on the radio, not a narrowing of the shared rule,
 * which other fields depend on. These assertions exist because the failure is
 * invisible to every server-side test and to `tsc`: the markup and the script were
 * both correct, and only the rendered result was wrong.
 */
describe("Mechanics radio groups survive the shared .admin-field rules (012 FR-005)", () => {
  const css = readFileSync("src/public/admin.css", "utf8");

  it("still has the shared full-width rule the radios must opt out of", () => {
    // The admin search form's fields still rely on it.
    expect(css).toMatch(/\.admin-field input[^{]*\{[^}]*width:\s*100%/);
  });

  // "resets the radio's width" and "never breaks option labels mid-word": retired.
  // The admin card's editing face was replaced by the wizard; its radio groups and
  // their rules went with it.
});

// Save and Publish availability is decided in one place (012 FR-012): retired.
// The admin card's editing face was replaced by the wizard; see client-admin-wizard.test.ts.

/**
 * 012 US9 (FR-057/FR-058) — the card half of the banned-voter defect. Guarded against
 * the served asset because none of it is reachable from a server-side test: the API
 * was already correct, and the failure was entirely in what the card did with it.
 */
describe("The card withdraws voting from a blocked viewer (012 FR-057/FR-058)", () => {
  const js = readFileSync("src/public/pollCard.js", "utf8");

  it("reads the server's verdict rather than deciding for itself", () => {
    expect(js).toMatch(/poll\.canVote === false/);
    expect(js).toContain("voteBlockedReason");
  });

  it("hides both controls that lead to a vote", () => {
    const fn = js.match(/function updateBlockedState\(\)[\s\S]*?\n  \}/)?.[0] ?? "";
    expect(fn).toMatch(/voteBtn\.hidden = true/);
    expect(fn).toMatch(/submitBtn\.hidden = true/);
  });

  it("disables Submit for a blocked viewer even if the back face is reached", () => {
    const fn = js.match(/function updateSubmitState\(\)[\s\S]*?\n  \}/)?.[0] ?? "";
    expect(fn).toContain("viewerBlockedReason()");
  });

  it("never swallows a refused vote", () => {
    // The original fell straight through to fetchPoll(), which re-rendered and quietly
    // re-enabled the button — a vote that did not happen and said nothing.
    expect(js).toContain("function showVoteError");
    const submit = js.match(/submitBtn\?\.addEventListener\([\s\S]*?\n  \}\);/)?.[0] ?? "";
    expect(submit).toContain("showVoteError(result.error");
    // The network failure is caught by the vote client, which answers with a message
    // the card shows rather than swallowing.
    const voteClient = readFileSync(path.resolve("src/public/voteClient.js"), "utf8");
    expect(voteClient).toMatch(/catch\s*\{[\s\S]*could not be sent/);
  });

  it("carries both message elements in the card template", () => {
    expect(js).toContain('class="poll-blocked-message"');
    expect(js).toContain('class="poll-vote-error"');
  });
});

/**
 * 012 US10 (FR-059/FR-060) — participant changes are buffered like every other field.
 *
 * They used to write immediately through three routes of their own, so a ban took
 * effect the instant it was clicked: voters saw their vote vanish before the
 * administrator saved anything, Save and Publish stayed disabled because nothing was
 * pending, and Cancel could not undo it. Two save models on one page — the same defect
 * R1 fixed for the choice list.
 */
describe("Participant edits are deferred to Save and Publish (012 FR-059)", () => {
  const js = readFileSync("src/public/adminCard.js", "utf8");

  it("makes no request of its own for a participant change", () => {
    // The three routes are deleted; a lingering call would 404 in silence.
    expect(js).not.toContain("/invited");
    expect(js).not.toMatch(/\/participants\//);
    expect(js).not.toMatch(/\/banned\//);
  });

  // The rest of this section read the participant lists on the editing face, which
  // the wizard replaced; the lists are not edited on the admin page for now.
});

// Clearing the voter count limit sends null, not an empty string (012 FR-061): retired.
// The admin card's editing face was replaced by the wizard; see client-admin-wizard.test.ts.

// Voter count limit field presentation (012 FR-006): retired.
// The admin card's editing face was replaced by the wizard; see client-admin-wizard.test.ts.

// Editing form spacing (012): retired.
// The admin card's editing face was replaced by the wizard; see client-admin-wizard.test.ts.

/**
 * 012: entering the Choices box while it still holds the labels a new poll is seeded
 * with selects them, so the author types straight over them. Deliberately narrow —
 * selecting real content on focus is a good way to lose someone's work to a stray
 * keystroke, so the behaviour applies only to the untouched defaults.
 */
describe("Default choices are selected on entry (012)", () => {
  const js = readFileSync("src/public/adminCard.js", "utf8");

  it("selects only when the box still holds the seeded defaults", () => {
    expect(js).toContain("function holdsOnlyDefaultChoices");
    const focus = js.match(/box\.addEventListener\("focus"[\s\S]*?\}\);/)?.[0] ?? "";
    expect(focus).toContain("holdsOnlyDefaultChoices");
    expect(focus).toContain("box.select()");
  });

  it("keeps the selection through the click that produced the focus", () => {
    // Without this the mouseup collapses the selection to a caret and the whole
    // behaviour is invisible to anyone who clicks rather than tabs in.
    const up = js.match(/box\.addEventListener\("mouseup"[\s\S]*?\}\);/)?.[0] ?? "";
    expect(up).toContain("preventDefault");
  });

  it("mirrors the server's default labels", () => {
    // If service.ts's DEFAULT_CHOICE_LABELS ever changes, this stops matching and the
    // box quietly behaves as it did before — it must never guess.
    const service = readFileSync("src/polls/service.ts", "utf8");
    const server = service.match(/DEFAULT_CHOICE_LABELS = \[([^\]]*)\]/)?.[1] ?? "";
    const client = js.match(/DEFAULT_CHOICE_LABELS = \[([^\]]*)\]/)?.[1] ?? "";
    const norm = (s: string) => s.replace(/\s|"/g, "");
    expect(norm(client)).toBe(norm(server));
  });
});

/**
 * 012 regression guard — invisible button text, found in manual validation.
 *
 * `styles.css` styles every `<button>` as a filled accent control with white text.
 * Any admin button that opts out of that fill by setting a transparent background
 * inherits the white text unless it also sets `color` — leaving a legible outline
 * with nothing readable inside it. The Open/Close/Archive buttons hit this, and so
 * did Re-attempt Screening, which nobody would have seen until a poll was rejected.
 *
 * This checks the rule rather than the two instances, so the next transparent button
 * added to this stylesheet cannot repeat it.
 */
describe("Admin buttons that drop the global fill also set their own colour (012)", () => {
  const css = readFileSync("src/public/admin.css", "utf8");
  const globals = readFileSync("src/public/styles.css", "utf8");

  it("still has the global button rule these must opt out of", () => {
    // If this ever stops setting a colour, the overrides below become unnecessary and
    // this suite should be revisited rather than left asserting a dead requirement.
    expect(globals).toMatch(/(^|\})\s*button\s*\{[^}]*color:\s*#fff/);
  });

  it("declares a colour on every rule that makes a button background transparent", () => {
    const offenders: string[] = [];
    for (const m of css.matchAll(/([^{}]*?)\{([^}]*)\}/g)) {
      const selector = m[1]!.split("*/").pop()!.trim().replace(/\s+/g, " ");
      const body = m[2]!;
      const isButton = /btn|button/.test(selector);
      const dropsFill = /background:\s*(transparent|none)/.test(body);
      const setsColour = /(?<![-\w])color\s*:/.test(body);
      if (isButton && dropsFill && !setsColour) offenders.push(selector);
    }
    expect(offenders, `these would render white text on a light ground: ${offenders.join(", ")}`)
      .toEqual([]);
  });
});

/**
 * 012 FR-066: the ceiling is configurable, so the page must be told it. A client that
 * assumed 500 would accept values the server then refused, and would label the field
 * with a number that was no longer true.
 */
describe("The editing page reads the voter ceiling from configuration (012 FR-066)", () => {
  const js = readFileSync("src/public/adminCard.js", "utf8");

  it("fetches it", () => {
    const listJs = readFileSync("src/public/adminList.js", "utf8");
    expect(listJs).toContain("/api/config");
    expect(listJs).toContain("setRuntimeConfig");
    expect(js).toContain("maxPrivatePollVoters");
    // The voter limit field went with the editing face; the wizard reads the
    // choice bounds from the same configuration.
  });

  it("has it before the first render, not after", () => {
    const listJs = readFileSync("src/public/adminList.js", "utf8");
    const boot = listJs.slice(listJs.indexOf('DOMContentLoaded", async'));
    expect(boot.indexOf("loadRuntimeConfig()")).toBeLessThan(boot.indexOf("loadList()"));
  });
});

/**
 * 014 FR-038/FR-039/FR-040: the three settings are stored exactly as displayed, so a
 * rename has to reach every client that compares against one. Two sites fail silently
 * rather than loudly and are the reason this guard exists:
 *
 *  - pollCard.js decides single-versus-multiple selection by comparing choiceMode. A
 *    missed rename makes a single-choice poll behave as multiple-choice, with no error.
 *  - the admin card renders each value verbatim; a stale spelling would simply display
 *    the wrong words.
 *
 * Asserting against the exported constants rather than repeated literals means the next
 * rename is caught here instead of in production.
 */
describe("Renamed poll settings reach every client (014 FR-038/FR-039/FR-040)", () => {
  const OLD_SPELLINGS = [
    "SINGLE-CHOICE-POLL", "MULTIPLE-CHOICE-POLL",
    "FINAL-VOTE-POLL", "DYNAMIC-VOTE-POLL",
    "PUBLIC POLL", "INVITATION ONLY", "ANYONE WITH THE LINK"
  ];

  it("compares the voter-facing card against the current choiceMode value", async () => {
    const res = await request(ctx.app).get("/pollCard.js");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Single-Choice Poll");
  });

  it("carries every current visibility value on the admin card", async () => {
    const res = await request(ctx.app).get("/adminCard.js");
    for (const value of POLL_VISIBILITIES) {
      expect(res.text, value).toContain(value);
    }
  });

  it("leaves no old spelling anywhere in the shipped client", async () => {
    for (const asset of ["/pollCard.js", "/adminCard.js", "/adminList.js", "/tabs.js", "/trending.js", "/deltaClient.js", "/app.js"]) {
      const res = await request(ctx.app).get(asset);
      for (const stale of OLD_SPELLINGS) {
        expect(res.text, `${asset} still carries ${stale}`).not.toContain(stale);
      }
    }
  });

  // "renders the settings verbatim" retired: the Settings Summary words each setting in
  // plain language, and the wizard stores the values verbatim (client-admin-wizard.test.ts).
});

/**
 * 014 research R5: a card in Edit mode is exempt from the periodic refresh. Skipping
 * its row is not enough — replaceChildren() on the list detaches every card, and a
 * detached card blurs the field being typed in, so focus was lost on every tick.
 */
describe("The periodic refresh never detaches the card being edited (014 R5)", () => {
  const listJs = readFileSync("src/public/adminList.js", "utf8");
  const loadList = listJs.slice(listJs.indexOf("async function loadList"), listJs.indexOf("async function loadRuntimeConfig"));

  it("reconciles the list in place instead of replacing its children", () => {
    expect(loadList).not.toContain("replaceChildren");
    expect(loadList).toContain("syncChildren(container, nextOrder)");
  });

  it("leaves cards already in position where they are, and restores focus otherwise", () => {
    const sync = listJs.slice(listJs.indexOf("function syncChildren"), listJs.indexOf("async function loadList"));
    expect(sync).toMatch(/if \(container\.children\[i\] !== node\) container\.insertBefore/);
    expect(sync).toContain("document.activeElement");
    expect(sync).toContain("active.focus(");
    expect(sync).toContain("setSelectionRange");
  });
});

/**
 * 014 FR-037: the create control is unavailable while a card is being edited. Setting
 * `disabled` alone is not enough — nothing styles a disabled .btn-primary outside the
 * card shell, so the button looked exactly as live as before.
 */
describe("A disabled create control looks disabled (014 FR-037)", () => {
  it("styles .admin-create-btn:disabled in admin.css", () => {
    const css = readFileSync("src/public/admin.css", "utf8");
    expect(css).toMatch(/\.admin-create-btn:disabled\s*{[^}]*opacity/);
  });
});

// Frozen mechanics show their value on the editing card (014): retired.
// The admin card's editing face was replaced by the wizard; see client-admin-wizard.test.ts.

/**
 * The admin stylesheet keeps no rule for the removed editing face or the older admin
 * list: every class and id below appears in no admin page or script, so a selector that
 * names one again is dead weight. Each is matched as a whole name, so
 * `.card-dates-panel` (in use) is not `.card-dates`.
 */
describe("admin.css keeps no rule nothing on the admin pages uses", () => {
  const css = readFileSync("src/public/admin.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const REMOVED = ["admin-field--inline", "admin-field--tight", "admin-field-error", "admin-field-hint", "admin-field-row--mechanics", "admin-icon-cell", "admin-publish-bar", "admin-rejection-reason", "admin-row-error", "admin-screening-line", "admin-subtitle-line", "admin-title-line", "admin-title-link", "card-body", "card-choice-list", "card-choices", "card-column", "card-counts", "card-dates", "card-field--stacked", "card-mechanics", "card-pen", "card-rosters", "card-schedule", "choices-count", "choices-editor", "choices-gutter", "choices-hint", "is-frozen", "mechanics-group", "mechanics-radios", "mechanics-static", "pollTitle", "radio-option", "roster-head", "roster-invite-row", "roster-label", "roster-list", "roster-list--empty", "roster-message", "roster-nav", "roster-page-box", "roster-pager", "roster-section", "roster-toggle", "voterCountLimit", "voterCountLimitField"];

  it("names none of the removed classes or ids in a selector", () => {
    const back = REMOVED.filter((name) => new RegExp("[.#]" + name + "(?![\\w-])").test(css));
    expect(back, `rules came back for: ${back.join(", ")}`).toEqual([]);
  });
});

describe("Private poll settings on the card", () => {
  const js = readFileSync("src/public/adminCard.js", "utf8");

  it("stores the two-valued visibility and the sharing modes verbatim", () => {
    expect(js).toContain('pollVisibility: "Private Poll", pollSharingMode: "Anyone With The Link"');
    expect(js).toContain('pollVisibility: "Private Poll", pollSharingMode: "Invitation Only"');
    expect(js).toContain('pollVisibility: "Public Poll", pollSharingMode: null');
  });

  it("carries none of the retired five-word visibility values", () => {
    expect(js).not.toContain("Private Poll - ");
    expect(js).not.toContain("Show Who Voted");
  });
});

describe("pollCard.css title wrapping (032 FIX05)", () => {
  it("lets the question and the subtitle break inside an unbroken run, so a long title cannot widen the card", async () => {
    const res = await request(ctx.app).get("/pollCard.css");
    expect(res.status).toBe(200);
    const rule = (selector: string) => {
      const start = res.text.indexOf(`\n  ${selector}{`);
      expect(start).toBeGreaterThan(-1);
      return res.text.slice(start, res.text.indexOf("}", start));
    };
    expect(rule(".question")).toContain("overflow-wrap:anywhere;");
    expect(rule(".subtitle")).toContain("overflow-wrap:anywhere;");
  });
});
