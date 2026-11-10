/**
 * whoVoted.js alone in jsdom: which polls it asks about, the panel it builds,
 * the two sorts, its retries and the order of the maximized view's right column
 * (specs/20261110-123524-WHO-VOTED-REPORT/contracts/ui-contracts.md C1–C3).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const publicDir = path.resolve("src/public");
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

type Reply = { status: number; body?: unknown };
type Voter = { name: string; choiceIds: string[]; votedAt: string };

interface Choice {
  id: string;
  label: string;
  position: number;
  pct: number;
}

interface Detail {
  pollVisibility: string;
  pollState: string;
  contentVersion: number;
  countsVersion: number;
  choices: Choice[];
}

const AT = "2026-11-10T17:04:12.000Z";

const detailOf = (overrides: Partial<Detail> = {}): Detail => ({
  pollVisibility: "Private Poll",
  pollState: "OPEN",
  contentVersion: 1,
  countsVersion: 1,
  choices: [
    { id: "c1", label: "Option 1", position: 0, pct: 10 },
    { id: "c2", label: "Option 2", position: 1, pct: 40 },
    { id: "c3", label: "Option 3", position: 2, pct: 40 },
    { id: "c4", label: "Option 4", position: 3, pct: 10 }
  ],
  ...overrides
});

const report = (voters: Voter[], extra: Record<string, unknown> = {}): Reply => ({ status: 200, body: { voters, ...extra } });

/**
 * One section, the script, a fetch whose replies the test hands out in turn
 * (or holds back), and timers the test runs by hand.
 */
function panelPage() {
  const dom = new JSDOM('<section class="maximized-voters" aria-labelledby="maximizedVotersHeading" hidden></section>', {
    url: "http://localhost/",
    runScripts: "outside-only"
  });
  const { window } = dom;
  const requests: string[] = [];
  const replies: Reply[] = [];
  const held: ((reply: Reply) => void)[] = [];
  let holding = false;
  let nextId = 1;
  const timers = new Map<number, { fn: () => void; ms: number }>();

  window.setTimeout = ((fn: () => void, ms: number) => {
    const id = nextId++;
    timers.set(id, { fn, ms });
    return id;
  }) as unknown as typeof window.setTimeout;
  window.clearTimeout = ((id: number) => {
    timers.delete(id);
  }) as typeof window.clearTimeout;
  window.fetch = ((url: string) => {
    requests.push(url);
    const answer = (reply: Reply) => ({ status: reply.status, json: async () => reply.body });
    if (holding) return new Promise((resolve) => held.push((reply) => resolve(answer(reply))));
    return Promise.resolve(answer(replies.shift() ?? { status: 500 }));
  }) as unknown as typeof window.fetch;
  window.eval(readFileSync(path.join(publicDir, "whoVoted.js"), "utf8"));

  const section = window.document.querySelector<HTMLElement>(".maximized-voters")!;
  const api = (window as unknown as { WhoVoted: { show: (s: unknown, pid: string, d: Detail) => void; hide: (s: unknown) => void } })
    .WhoVoted;

  return {
    window,
    section,
    requests,
    replies,
    timers,
    hold() {
      holding = true;
    },
    release(index: number, reply: Reply) {
      held[index]!(reply);
    },
    async show(pid: string, detail: Detail) {
      api.show(section, pid, detail);
      await flush();
    },
    hide() {
      api.hide(section);
    },
    async runTimers() {
      const due = Array.from(timers.values());
      timers.clear();
      due.forEach((timer) => timer.fn());
      await flush();
    },
    groups() {
      return Array.from(section.querySelectorAll("tbody")).map((body) =>
        Array.from(body.querySelectorAll("tr")).map((row) => Array.from(row.children).map((cell) => cell.textContent))
      );
    },
    headers() {
      return Array.from(section.querySelectorAll("thead th")).map((cell) => cell.textContent);
    },
    segment(label: string) {
      return Array.from(section.querySelectorAll<HTMLButtonElement>(".who-voted-segment")).find((b) => b.textContent === label)!;
    }
  };
}

const firstCells = (groups: (string | null)[][][]) => groups.map((rows) => rows[0]![0]);

describe("which polls it asks about", () => {
  it("asks for a private OPEN or CLOSED poll, never a public one or one not open or closed", async () => {
    const page = panelPage();
    page.replies.push(report([]), report([]));
    await page.show("p1", detailOf());
    await page.show("p2", detailOf({ pollState: "CLOSED" }));
    await page.show("p3", detailOf({ pollVisibility: "Public Poll" }));
    await page.show("p4", detailOf({ pollState: "WAITING TO OPEN" }));
    await page.show("p5", detailOf({ pollState: "INITIALIZED" }));
    expect(page.requests).toEqual(["/api/me/polls/p1/voters", "/api/me/polls/p2/voters"]);
    expect(page.section.hidden).toBe(true);
  });

  it("hides on a 404 and asks again only when the poll's contentVersion changes", async () => {
    const page = panelPage();
    page.replies.push(report([{ name: "Ann", choiceIds: ["c1"], votedAt: AT }]), { status: 404, body: { error: "Not found" } });
    await page.show("p1", detailOf());
    expect(page.section.hidden).toBe(false);
    await page.show("p1", detailOf({ countsVersion: 2 }));
    expect(page.section.hidden).toBe(true);
    expect(page.section.children).toHaveLength(0);
    await page.show("p1", detailOf({ countsVersion: 3 }));
    expect(page.requests).toHaveLength(2);
    page.replies.push(report([]));
    await page.show("p1", detailOf({ countsVersion: 3, contentVersion: 2 }));
    expect(page.requests).toHaveLength(3);
    expect(page.section.hidden).toBe(false);
  });
});

describe("Sort by Voter", () => {
  it("lists each voter as a group, by name, with their choices in bar order and dated lines", async () => {
    const page = panelPage();
    page.replies.push(
      report([
        { name: "bob", choiceIds: ["c4", "c2"], votedAt: AT },
        { name: "Voter 10", choiceIds: ["c1"], votedAt: AT },
        { name: "Voter 9", choiceIds: ["c3"], votedAt: AT },
        { name: "Ann", choiceIds: ["c1"], votedAt: "2026-11-10T18:00:00.000Z" },
        { name: "ann", choiceIds: ["c3"], votedAt: "2026-11-09T18:00:00.000Z" }
      ])
    );
    await page.show("p1", detailOf());
    const { section } = page;
    expect(section.hidden).toBe(false);
    expect(section.querySelector("h2")!.textContent).toBe("Who voted");
    expect(section.getAttribute("aria-labelledby")).toBe(section.querySelector("h2")!.id);
    expect(page.segment("Sort by Voter").getAttribute("aria-pressed")).toBe("true");
    expect(page.segment("Sort by Choice").getAttribute("aria-pressed")).toBe("false");
    expect(page.headers()).toEqual(["Voter", "Choice", "Date"]);

    const groups = page.groups();
    expect(firstCells(groups)).toEqual(["ann", "Ann", "bob", "Voter 9", "Voter 10"]);
    expect(groups[2]!.map((row) => row[row.length - 2])).toEqual(["Option 2", "Option 4"]);

    const bob = section.querySelectorAll("tbody")[2]!;
    const title = bob.querySelectorAll("th");
    expect(title).toHaveLength(1);
    expect(title[0]!.getAttribute("scope")).toBe("rowgroup");
    expect(title[0]!.getAttribute("rowspan")).toBe("2");
    const times = Array.from(bob.querySelectorAll("time"));
    expect(times).toHaveLength(2);
    const day = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(AT));
    const moment = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(AT));
    times.forEach((time) => {
      expect(time.getAttribute("datetime")).toBe(AT);
      expect(time.textContent).toBe(day);
      expect(time.getAttribute("title")).toBe(moment);
    });
  });

  it("puts a name in as text", async () => {
    const page = panelPage();
    page.replies.push(report([{ name: "<b>x</b>", choiceIds: ["c1"], votedAt: AT }]));
    await page.show("p1", detailOf());
    const title = page.section.querySelector("tbody th")!;
    expect(title.textContent).toBe("<b>x</b>");
    expect(page.section.querySelector("b")).toBeNull();
  });

  it("shows No votes yet. without a sort control or table when nobody has voted", async () => {
    const page = panelPage();
    page.replies.push(report([]));
    await page.show("p1", detailOf());
    expect(page.section.hidden).toBe(false);
    expect(page.section.querySelector(".who-voted-empty")!.textContent).toBe("No votes yet.");
    expect(page.section.querySelector(".who-voted-sort")).toBeNull();
    expect(page.section.querySelector("table")).toBeNull();
  });
});

describe("Sort by Choice", () => {
  const voters: Voter[] = [
    { name: "Cy", choiceIds: ["c3"], votedAt: AT },
    { name: "Bea", choiceIds: ["c2", "c3"], votedAt: AT },
    { name: "Al", choiceIds: ["c3"], votedAt: AT }
  ];

  it("redraws from the held report, grouped by choice in bar order, without a request", async () => {
    const page = panelPage();
    page.replies.push(report(voters));
    await page.show("p1", detailOf());
    page.segment("Sort by Choice").click();
    expect(page.requests).toHaveLength(1);
    expect(page.segment("Sort by Choice").getAttribute("aria-pressed")).toBe("true");
    expect(page.segment("Sort by Voter").getAttribute("aria-pressed")).toBe("false");
    expect(page.segment("Sort by Choice").querySelector("svg[aria-hidden='true']")).not.toBeNull();
    expect(page.segment("Sort by Voter").querySelector("svg")).toBeNull();
    expect(page.headers()).toEqual(["Choice", "Voter", "Date"]);
    const groups = page.groups();
    expect(firstCells(groups)).toEqual(["Option 2", "Option 3"]);
    expect(groups[1]!.map((row) => row[row.length - 2])).toEqual(["Al", "Bea", "Cy"]);
    expect(page.window.localStorage.length).toBe(0);
    expect(page.window.sessionStorage.length).toBe(0);
  });

  it("keeps the sort for the same poll, and starts on Sort by Voter after hide or for another poll", async () => {
    const page = panelPage();
    page.replies.push(report(voters), report(voters), report(voters), report(voters));
    await page.show("p1", detailOf());
    page.segment("Sort by Choice").click();
    await page.show("p1", detailOf({ countsVersion: 2 }));
    expect(page.segment("Sort by Choice").getAttribute("aria-pressed")).toBe("true");

    page.hide();
    await page.show("p1", detailOf());
    expect(page.segment("Sort by Voter").getAttribute("aria-pressed")).toBe("true");

    page.segment("Sort by Choice").click();
    await page.show("p2", detailOf());
    expect(page.segment("Sort by Voter").getAttribute("aria-pressed")).toBe("true");
  });

  it("regroups when the bar order changes", async () => {
    const page = panelPage();
    page.replies.push(report(voters), report(voters));
    await page.show("p1", detailOf());
    page.segment("Sort by Choice").click();
    const swapped = detailOf({ countsVersion: 2 });
    swapped.choices[2]!.pct = 90;
    await page.show("p1", swapped);
    expect(firstCells(page.groups())).toEqual(["Option 3", "Option 2"]);
  });

  it("switches 100 voters synchronously with no request", async () => {
    const page = panelPage();
    const many = Array.from({ length: 100 }, (_, i) => ({ name: `Voter ${i}`, choiceIds: [`c${(i % 4) + 1}`], votedAt: AT }));
    page.replies.push(report(many));
    await page.show("p1", detailOf());
    page.segment("Sort by Choice").click();
    expect(page.groups()).toHaveLength(4);
    page.segment("Sort by Voter").click();
    expect(page.groups()).toHaveLength(100);
    expect(page.requests).toHaveLength(1);
  });
});

describe("following the bars", () => {
  it("refetches on a new countsVersion and redraws in the selected order", async () => {
    const page = panelPage();
    page.replies.push(report([{ name: "Ann", choiceIds: ["c1"], votedAt: AT }]));
    await page.show("p1", detailOf());
    page.segment("Sort by Choice").click();
    page.replies.push(report([{ name: "Ann", choiceIds: ["c1"], votedAt: AT }, { name: "Ben", choiceIds: ["c2"], votedAt: AT }]));
    await page.show("p1", detailOf({ countsVersion: 2 }));
    expect(page.requests).toHaveLength(2);
    expect(page.headers()[0]).toBe("Choice");
    expect(firstCells(page.groups())).toEqual(["Option 2", "Option 1"]);
  });

  it("refetches once after settleMs, and not without it", async () => {
    const page = panelPage();
    page.replies.push(report([]));
    await page.show("p1", detailOf());
    expect(page.timers.size).toBe(0);

    page.replies.push(report([], { settleMs: 2000 }), report([], { settleMs: 2000 }));
    await page.show("p1", detailOf({ countsVersion: 2 }));
    expect(Array.from(page.timers.values()).map((t) => t.ms)).toEqual([2000]);
    await page.runTimers();
    expect(page.requests).toHaveLength(3);
    expect(page.timers.size).toBe(0);
  });

  it("refetches once after a 429's retryAfterMs, and reschedules a retry answered by a 429 only once", async () => {
    const page = panelPage();
    page.replies.push({ status: 429, body: { error: "too-soon", retryAfterMs: 1500 } });
    await page.show("p1", detailOf());
    expect(Array.from(page.timers.values()).map((t) => t.ms)).toEqual([1500]);
    page.replies.push(report([]));
    await page.runTimers();
    expect(page.requests).toHaveLength(2);
    expect(page.timers.size).toBe(0);

    page.replies.push(report([], { settleMs: 2000 }), { status: 429, body: { retryAfterMs: 700 } }, { status: 429, body: { retryAfterMs: 700 } });
    await page.show("p1", detailOf({ countsVersion: 2 }));
    await page.runTimers();
    expect(Array.from(page.timers.values()).map((t) => t.ms)).toEqual([700]);
    await page.runTimers();
    expect(page.requests).toHaveLength(5);
    expect(page.timers.size).toBe(0);
  });

  it("cancels a pending retry on a newer show or hide", async () => {
    const page = panelPage();
    page.replies.push(report([], { settleMs: 2000 }), report([]));
    await page.show("p1", detailOf());
    expect(page.timers.size).toBe(1);
    await page.show("p1", detailOf({ countsVersion: 2 }));
    expect(page.timers.size).toBe(0);

    page.replies.push(report([], { settleMs: 2000 }));
    await page.show("p1", detailOf({ countsVersion: 3 }));
    page.hide();
    expect(page.timers.size).toBe(0);
  });

  it("ignores an older reply that arrives after a newer one, and one that arrives after hide", async () => {
    const page = panelPage();
    page.hold();
    await page.show("p1", detailOf());
    await page.show("p1", detailOf({ countsVersion: 2 }));
    page.release(1, report([{ name: "New", choiceIds: ["c1"], votedAt: AT }]));
    await flush();
    page.release(0, report([{ name: "Old", choiceIds: ["c1"], votedAt: AT }]));
    await flush();
    expect(firstCells(page.groups())).toEqual(["New"]);

    await page.show("p1", detailOf({ countsVersion: 3 }));
    page.hide();
    page.release(2, report([{ name: "Late", choiceIds: ["c1"], votedAt: AT }]));
    await flush();
    expect(page.section.hidden).toBe(true);
    expect(page.section.children).toHaveLength(0);
  });

  it("keeps the last table on any other failure", async () => {
    const page = panelPage();
    page.replies.push(report([{ name: "Ann", choiceIds: ["c1"], votedAt: AT }]), { status: 500 });
    await page.show("p1", detailOf());
    await page.show("p1", detailOf({ countsVersion: 2 }));
    expect(page.section.hidden).toBe(false);
    expect(firstCells(page.groups())).toEqual(["Ann"]);
    expect(page.timers.size).toBe(0);
  });
});

describe("structure", () => {
  it("gives each group its own tbody with a rowgroup header, a labelled sort group and no height of its own", async () => {
    const page = panelPage();
    page.replies.push(
      report([
        { name: "Ann", choiceIds: ["c1", "c2", "c3"], votedAt: AT },
        { name: "Ben", choiceIds: ["c4"], votedAt: AT }
      ])
    );
    await page.show("p1", detailOf());
    const bodies = page.section.querySelectorAll("tbody");
    expect(bodies).toHaveLength(2);
    expect(bodies[0]!.querySelectorAll("tr")).toHaveLength(3);
    const headers = page.section.querySelectorAll("tbody th");
    expect(Array.from(headers).map((th) => [th.getAttribute("scope"), th.getAttribute("rowspan")])).toEqual([
      ["rowgroup", "3"],
      ["rowgroup", "1"]
    ]);
    const sort = page.section.querySelector(".who-voted-sort")!;
    expect(sort.getAttribute("role")).toBe("group");
    expect(sort.getAttribute("aria-label")).toBeTruthy();
    expect(page.section.style.height).toBe("");
    expect(page.section.style.maxHeight).toBe("");
    expect(page.section.style.overflow).toBe("");
  });

  it("sits between Notes and the line graph in the maximized view's right column", () => {
    const dom = new JSDOM(readFileSync(path.join(publicDir, "index.html"), "utf8"));
    const template = dom.window.document.getElementById("maximizedCardGrid") as HTMLTemplateElement;
    const view = template.content.firstElementChild!.cloneNode(true) as Element;
    const right = view.querySelector(".maximized-space-right")!;
    expect(Array.from(right.children).map((child) => child.className)).toEqual([
      "maximized-notes",
      "maximized-voters",
      "maximized-graph"
    ]);
  });

  it("keeps the panel's look in M3 tokens with no height cap or scrolling of its own", () => {
    const css = readFileSync(path.join(publicDir, "who-voted-m3.css"), "utf8");
    expect(css).toMatch(/\.who-voted-table tbody:nth-of-type\(even\)\{\s*background:var\(--md-sys-color-surface-container\);/);
    expect(css).not.toContain("max-height");
    const section = css.slice(css.indexOf(".maximized-voters{"), css.indexOf("}", css.indexOf(".maximized-voters{")));
    expect(section).not.toMatch(/height|overflow/);
  });
});
