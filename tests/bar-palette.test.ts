import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { BAR_PALETTE, isPaletteColor, normalizeColor } from "../src/polls/barPalette.js";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestContext();
});

afterAll(async () => {
  await ctx.stop();
});

describe("the bar palette", () => {
  it("holds the eighteen colours in picker order, each name and hex unique", () => {
    expect(BAR_PALETTE.map((c) => c.name)).toEqual([
      "red", "blue", "black", "darkslategray", "darkgray", "gainsboro", "darkred", "orangered", "yellow",
      "greenyellow", "lime", "darkgreen", "teal", "dodgerblue", "darkslateblue", "purple", "plum", "saddlebrown"
    ]);
    expect(BAR_PALETTE.map((c) => c.hex)).toEqual([
      "#F91010", "#0808FD", "#000000", "#545454", "#9E9E9E", "#E0E0E0", "#880015", "#FF6601", "#FFFF00",
      "#E3E335", "#06D400", "#006120", "#007A7E", "#0695F5", "#1A539E", "#800080", "#FF91CB", "#784315"
    ]);
    expect(new Set(BAR_PALETTE.map((c) => c.name)).size).toBe(18);
    expect(new Set(BAR_PALETTE.map((c) => c.hex)).size).toBe(18);
    for (const { hex } of BAR_PALETTE) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
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
});
