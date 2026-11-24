import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  AFFIRMATIVE_COLOR, AFFIRMATIVE_COLOR_DARK, BAR_PALETTE, BAR_PALETTE_DARK, NEGATIVE_COLOR, NEGATIVE_COLOR_DARK, RESULTS_PALETTE,
  RESULTS_PALETTE_DARK, SERVED_BAR_PALETTE, isPaletteColor, normalizeColor
} from "../src/polls/barPalette.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext();
});

afterAll(async () => {
  await ctx.stop();
});

describe("the bar palette", () => {
  it("holds the automatic colours, each name and hex unique and neither the Yes nor the No colour", () => {
    // The colours themselves are chosen by hand; COLOR-CONTRAST.md and tests/color-contrast.test.ts judge them.
    expect(RESULTS_PALETTE.length).toBeGreaterThanOrEqual(8);
    expect(new Set(RESULTS_PALETTE.map((c) => c.name)).size).toBe(RESULTS_PALETTE.length);
    expect(new Set(RESULTS_PALETTE.map((c) => c.hex)).size).toBe(RESULTS_PALETTE.length);
    for (const { hex } of RESULTS_PALETTE) expect([AFFIRMATIVE_COLOR.hex, NEGATIVE_COLOR.hex]).not.toContain(hex);
  });

  it("is, for the creator, the Yes and No colours followed by the automatic palette, each name and hex unique", () => {
    expect(BAR_PALETTE).toEqual([AFFIRMATIVE_COLOR, NEGATIVE_COLOR, ...RESULTS_PALETTE]);
    expect([AFFIRMATIVE_COLOR, NEGATIVE_COLOR]).toEqual([{ name: "darkgreen", hex: "#006120" }, { name: "red", hex: "#EC0606" }]);
    expect(new Set(BAR_PALETTE.map((c) => c.name)).size).toBe(RESULTS_PALETTE.length + 2);
    expect(new Set(BAR_PALETTE.map((c) => c.hex)).size).toBe(RESULTS_PALETTE.length + 2);
    for (const { hex } of BAR_PALETTE) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("matches pollCard.js: the same automatic palette in the same order, and the same Yes and No colours", () => {
    const script = readFileSync(path.resolve("src/public/pollCard.js"), "utf8");
    const block = script.slice(script.indexOf("RESULTS_PALETTE_ENTRIES = ["));
    // Each entry may be written name first or hex first, with either kind of quote.
    const list = block.slice(0, block.indexOf("]"));
    const entries = [...list.matchAll(/\{[^}]*\}/g)].map(([entry]) => ({
      name: /name:\s*["']([^"']+)["']/.exec(entry)?.[1],
      hex: /hex:\s*["'](#[0-9A-Fa-f]{6})["']/.exec(entry)?.[1]
    }));
    expect(entries).toHaveLength(RESULTS_PALETTE.length);
    expect(entries).toEqual(RESULTS_PALETTE);
    expect(script).toContain(`const SEMANTIC_AFFIRMATIVE_COLOR = '${AFFIRMATIVE_COLOR.hex}';`);
    // The Dark scheme's palette: the same list as RESULTS_PALETTE_DARK, and the same Dark Yes and No colours.
    const darkBlock = script.slice(script.indexOf("RESULTS_PALETTE_ENTRIES_DARK = ["));
    const darkList = darkBlock.slice(0, darkBlock.indexOf("]"));
    const dark = [...darkList.matchAll(/\{[^}]*\}/g)].map(([entry]) => ({
      name: /name:\s*["']([^"']*)["']/.exec(entry)?.[1],
      hex: /hex:\s*["'](#[0-9A-Fa-f]{6})["']/.exec(entry)?.[1]
    }));
    expect(dark).toEqual(RESULTS_PALETTE_DARK);
    expect(script).toContain(`const SEMANTIC_AFFIRMATIVE_COLOR_DARK = '${AFFIRMATIVE_COLOR_DARK.hex}';`);
    expect(script).toContain(`const SEMANTIC_NEGATIVE_COLOR_DARK = '${NEGATIVE_COLOR_DARK.hex}';`);
    expect(script).toContain(`const SEMANTIC_NEGATIVE_COLOR = '${NEGATIVE_COLOR.hex}';`);
  });

  it("has a Dark twin for every colour of the creator's palette, each a six-digit colour, none repeated", () => {
    expect(RESULTS_PALETTE_DARK).toHaveLength(RESULTS_PALETTE.length);
    expect(BAR_PALETTE_DARK).toEqual([AFFIRMATIVE_COLOR_DARK, NEGATIVE_COLOR_DARK, ...RESULTS_PALETTE_DARK]);
    for (const { hex } of BAR_PALETTE_DARK) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    expect(new Set(BAR_PALETTE_DARK.map((c) => c.hex)).size).toBe(BAR_PALETTE_DARK.length);
    // The browser receives each colour with its Dark twin; the stored and checked colour stays the Light hex.
    expect(SERVED_BAR_PALETTE).toEqual(BAR_PALETTE.map((c, i) => ({ ...c, darkHex: BAR_PALETTE_DARK[i]!.hex })));
  });

  it("draws bars at their real share: the temporary half-filled palette preview is switched off", () => {
    // Fails on purpose while the palettes are being chosen; set PALETTE_PREVIEW_HALF_FILL to false, or remove it, when they are final.
    expect(readFileSync(path.resolve("src/public/pollCard.js"), "utf8")).not.toContain("const PALETTE_PREVIEW_HALF_FILL = true;");
  });

  it("recognises every entry, in either letter case, and nothing else", () => {
    for (const { hex } of BAR_PALETTE) {
      expect(isPaletteColor(hex)).toBe(true);
      expect(isPaletteColor(hex.toLowerCase())).toBe(true);
    }
    for (const other of ["#123456", "red", "#FF000", "", undefined, null, 5]) expect(isPaletteColor(other)).toBe(false);
  });

  it("normalises a six-digit hex to upper case and rejects anything else", () => {
    expect(normalizeColor("#ff91cb")).toBe("#FF91CB");
    expect(normalizeColor("#123456")).toBe("#123456");
    for (const other of ["red", "#12", "123456", "#GGGGGG", undefined, null, 7]) expect(normalizeColor(other)).toBeUndefined();
  });

  it("is sent to the browser in the configuration response", async () => {
    const res = await request(ctx.app).get("/api/config");
    expect(res.body.barPalette).toEqual(BAR_PALETTE);
  });

  it("sends the choice-label limit as choiceLabelMax, with no wizardChoiceMax", async () => {
    const res = await request(ctx.app).get("/api/config");
    expect(res.body.choiceLabelMax).toBe(35);
    expect(res.body).not.toHaveProperty("wizardChoiceMax");
  });
});
