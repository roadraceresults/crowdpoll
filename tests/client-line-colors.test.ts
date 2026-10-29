/**
 * PollCard.lineColorOn in jsdom: every automatic, Yes/No and manual colour,
 * on the light and the dark surface, reaches 3:1 non-text contrast, keeps its
 * hue and saturation, and is returned unchanged when it already reaches 3:1.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { openPage, type BrowserPage } from "./helpers/browser.js";
import { BAR_PALETTE } from "../src/polls/barPalette.js";

const LIGHT = "#FFFFFF";
const DARK = "#0F1511";

let ctx: TestContext;
let page: BrowserPage;
let colors: string[] = [];

type LineColorOn = (hex: string, surface: string | null) => string;
const lineColorOn = (hex: string, surface: string | null) =>
  (page.window as unknown as { PollCard: { lineColorOn: LineColorOn } }).PollCard.lineColorOn(hex, surface);

beforeAll(async () => {
  ctx = await startTestContext();
  const script = (await request(ctx.app).get("/pollCard.js")).text;
  const block = script.slice(script.indexOf("RESULTS_PALETTE_ENTRIES = ["));
  const automatic = (block.slice(0, block.indexOf("];")).match(/#[0-9A-Fa-f]{6}/g) ?? []).map((hex) => hex.toUpperCase());
  const manual = BAR_PALETTE.map((entry) => entry.hex.toUpperCase());
  colors = [...new Set([...automatic, "#006120", "#F91010", ...manual])];
  page = await openPage(ctx, "index.html");
});

afterAll(async () => {
  page?.close();
  await ctx.stop();
});

// Relative luminance and contrast ratio as WCAG defines them: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

function hueAndSaturation(hex: string): { h: number; s: number } {
  const [r, g, b] = [0, 1, 2].map((i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (!d) return { h: 0, s: 0 };
  const l = (max + min) / 2;
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s };
}

const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

describe("line colours on the graph's surface (C1)", () => {
  it("covers the automatic, Yes/No and manual colours", () => {
    expect(colors.length).toBeGreaterThan(20);
  });

  for (const [name, surface] of [["light", LIGHT], ["dark", DARK]] as const) {
    it(`draws every colour at 3:1 or more on the ${name} surface, keeping its hue, and leaves a passing colour unchanged`, () => {
      for (const hex of colors) {
        const out = lineColorOn(hex, surface);
        expect(out, hex).toMatch(/^#[0-9A-F]{6}$/);
        expect(contrast(out, surface), hex).toBeGreaterThanOrEqual(3);
        if (contrast(hex, surface) >= 3) {
          expect(out, hex).toBe(hex);
          continue;
        }
        const before = hueAndSaturation(hex);
        const after = hueAndSaturation(out);
        if (before.s > 0) expect(hueDistance(before.h, after.h), hex).toBeLessThanOrEqual(1);
        expect(Math.abs(before.s - after.s), hex).toBeLessThanOrEqual(0.01);
      }
    });
  }

  it("shades to the nearest passing shade", () => {
    expect(lineColorOn("#000000", DARK)).toBe("#636363");
    expect(lineColorOn("#880015", DARK)).toBe("#C7001F");
    expect(lineColorOn("#FFFF00", LIGHT)).toBe("#999900");
    expect(lineColorOn("#E0E0E0", LIGHT)).toBe("#949494");
  });

  it("returns the colour as given when there is no surface", () => {
    expect(lineColorOn("#0808fd", null)).toBe("#0808fd");
  });
});
