/**
 * The line graph setting reaches a card: a projection carrying lineGraphEnabled
 * becomes a card whose detail carries it too (deltaClient.js).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";

let ctx: TestContext;
let page: BrowserPage | null = null;

beforeAll(async () => {
  ctx = await startTestContext();
});
afterAll(async () => {
  page?.close();
  await ctx.stop();
});

const card = (pid: string, lineGraphEnabled?: boolean) => ({
  pid,
  title: "Delta card",
  subtitle: "",
  choiceMode: "Single-Choice Poll",
  voteMutability: "Final-Vote Poll",
  pollVisibility: "Public Poll",
  pollSharingMode: "Anyone With The Link",
  pollState: "OPEN",
  startAt: null,
  endAt: null,
  choices: [{ id: "c1", label: "Yes", position: 0 }],
  contentVersion: 1,
  countsVersion: 0,
  ...(lineGraphEnabled === undefined ? {} : { lineGraphEnabled })
});

describe("a projection's line graph setting reaches the card", () => {
  it("copies lineGraphEnabled from the card into its detail, on and off", async () => {
    page = await openPage(ctx, "index.html", { scripts: ["deltaClient.js"] });
    const { DeltaClient } = page.window as unknown as {
      DeltaClient: {
        createTabState(): unknown;
        apply(state: unknown, body: unknown): Set<string>;
        toPollDetail(state: unknown, pid: string): { lineGraphEnabled: boolean } | null;
      };
    };
    const state = DeltaClient.createTabState();
    DeltaClient.apply(state, { cards: { on: card("on", true), off: card("off", false) }, counters: {} });
    expect(DeltaClient.toPollDetail(state, "on")!.lineGraphEnabled).toBe(true);
    expect(DeltaClient.toPollDetail(state, "off")!.lineGraphEnabled).toBe(false);
  });

  it("reads a card with no setting as off", async () => {
    page = await openPage(ctx, "index.html", { scripts: ["deltaClient.js"] });
    const { DeltaClient } = page.window as unknown as {
      DeltaClient: {
        createTabState(): unknown;
        apply(state: unknown, body: unknown): Set<string>;
        toPollDetail(state: unknown, pid: string): { lineGraphEnabled: boolean } | null;
      };
    };
    const state = DeltaClient.createTabState();
    DeltaClient.apply(state, { cards: { bare: card("bare") }, counters: {} });
    expect(DeltaClient.toPollDetail(state, "bare")!.lineGraphEnabled).toBe(false);
  });
});
