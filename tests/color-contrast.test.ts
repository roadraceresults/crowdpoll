/**
 * COLOR-CONTRAST.md is this test's data: every Frozen colours row keeps its values and every
 * Required pairs row reaches its minimum, in each scheme, with the colours m3-tokens.css sets.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { BAR_PALETTE, RESULTS_PALETTE } from "../src/polls/barPalette.js";
import * as brandColors from "../src/brandColors.js";

const root = path.resolve(".");
const publicDir = path.join(root, "src/public");
const read = (file: string) => readFileSync(file, "utf8");

type Scheme = "light" | "dark";
const SCHEMES: Scheme[] = ["light", "dark"];

const guideline = read(path.join(root, "COLOR-CONTRAST.md"));
const tokens = read(path.join(publicDir, "m3-tokens.css"));
const pollCardScript = read(path.join(publicDir, "pollCard.js"));

// ---------- The guideline's tables ----------

function sectionOf(markdown: string, heading: string): string {
  const start = markdown.indexOf(`\n## ${heading}\n`);
  if (start < 0) throw new Error(`COLOR-CONTRAST.md has no "## ${heading}" section`);
  const next = markdown.indexOf("\n## ", start + 1);
  return markdown.slice(start, next < 0 ? undefined : next);
}

function tableRows(section: string, header: string[]): string[][] {
  const lines = section.split("\n").map((line) => line.trim()).filter((line) => line.startsWith("|"));
  const cells = (line: string) => line.slice(1, -1).split("|").map((cell) => cell.trim());
  const at = lines.findIndex((line) => cells(line).join("|") === header.join("|"));
  if (at < 0) throw new Error(`no table headed ${header.join(" | ")}`);
  return lines.slice(at + 2).map(cells);
}

const unquote = (cell: string) => cell.replace(/^`|`$/g, "");

const frozen = tableRows(sectionOf(guideline, "Frozen colours"), ["Role", "Light", "Dark"])
  .map(([role, light, dark]) => ({ role: unquote(role!), light: unquote(light!).toUpperCase(), dark: unquote(dark!).toUpperCase() }));

interface Pair {
  foreground: string;
  background: string;
  min: number;
  below?: number;
  schemes: Scheme[];
  minimum: string;
}

function parseMinimum(cell: string): { min: number; below?: number } {
  const range = cell.match(/^([\d.]+)\s*–\s*<\s*([\d.]+)$/);
  if (range) return { min: Number(range[1]), below: Number(range[2]) };
  if (/^[\d.]+$/.test(cell)) return { min: Number(cell) };
  throw new Error(`unreadable minimum "${cell}"`);
}

function parseSchemes(cell: string): Scheme[] {
  if (cell === "both") return SCHEMES;
  if (cell === "light" || cell === "dark") return [cell];
  throw new Error(`unreadable schemes "${cell}"`);
}

const pairs: Pair[] = tableRows(sectionOf(guideline, "Required pairs"), ["Foreground", "Background", "Minimum", "Schemes", "Why"])
  .map(([foreground, background, minimum, schemes]) => ({
    foreground: unquote(foreground!),
    background: unquote(background!),
    ...parseMinimum(minimum!),
    schemes: parseSchemes(schemes!),
    minimum: minimum!
  }));

// ---------- Resolving a role per scheme, as the cascade does ----------

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// Custom properties of every top-level block with exactly this selector, later blocks winning.
function propertiesOf(css: string, selector: string): Map<string, string> {
  const out = new Map<string, string>();
  const text = stripComments(css);
  let at = 0;
  for (;;) {
    at = text.indexOf(`\n${selector}{`, at);
    if (at < 0) return out;
    const body = text.slice(at + selector.length + 2, text.indexOf("\n}", at));
    for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out.set(match[1]!, match[2]!.trim());
    at += selector.length;
  }
}

const lightRoles = propertiesOf(tokens, ":root");
const lightAliases = propertiesOf(tokens, ':root:not([data-theme="dark"])');
const darkBlock = propertiesOf(tokens, ':root[data-theme="dark"]');
// The legacy palettes load after m3-tokens.css, so they outrank its plain :root at equal specificity.
const legacy = new Map([...propertiesOf(read(path.join(publicDir, "pollCard.css")), ":root"), ...propertiesOf(read(path.join(publicDir, "site.css")), ":root")]);

const cascade: Record<Scheme, Map<string, string>[]> = {
  light: [lightAliases, legacy, lightRoles],
  dark: [darkBlock, legacy, lightRoles]
};

function constantOf(name: string): string | undefined {
  return pollCardScript.match(new RegExp(`const ${name} = '(#[0-9A-Fa-f]{6})'`))?.[1]?.toUpperCase();
}

function resolve(role: string, scheme: Scheme, seen: string[] = []): string {
  if (!role.startsWith("--")) {
    const value = constantOf(role);
    if (!value) throw new Error(`${role} is not a colour constant in pollCard.js`);
    return value;
  }
  if (seen.includes(role)) throw new Error(`${scheme}: ${[...seen, role].join(" → ")} is circular`);
  const value = cascade[scheme].map((block) => block.get(role)).find((v) => v !== undefined);
  if (value === undefined) throw new Error(`${scheme}: ${role} is not set`);
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value.toUpperCase();
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  if (!alias) throw new Error(`${scheme}: ${role} is "${value}", neither a #RRGGBB colour nor a var()`);
  return resolve(alias[1]!, scheme, [...seen, role]);
}

// ---------- Contrast: https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio ----------

function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

// ---------- Tests ----------

describe("COLOR-CONTRAST.md: frozen colours", () => {
  it("lists the frozen colours", () => {
    expect(frozen.length).toBeGreaterThan(0);
  });

  for (const row of frozen) {
    for (const scheme of SCHEMES) {
      it(`${scheme}: ${row.role} stays ${row[scheme]}`, () => {
        expect(resolve(row.role, scheme)).toBe(row[scheme]);
      });
    }
  }
});

describe("COLOR-CONTRAST.md: required pairs", () => {
  it("names only roles that resolve in their schemes", () => {
    for (const pair of pairs) {
      for (const scheme of pair.schemes) {
        expect(() => resolve(pair.foreground, scheme)).not.toThrow();
        expect(() => resolve(pair.background, scheme)).not.toThrow();
      }
    }
  });

  for (const pair of pairs) {
    for (const scheme of pair.schemes) {
      it(`${scheme}: ${pair.foreground} on ${pair.background} ≥ ${pair.minimum}`, () => {
        const foreground = resolve(pair.foreground, scheme);
        const background = resolve(pair.background, scheme);
        const ratio = contrast(foreground, background);
        const said = `${foreground} on ${background} is ${ratio.toFixed(2)}:1`;
        expect(ratio, said).toBeGreaterThanOrEqual(pair.min);
        if (pair.below !== undefined) expect(ratio, said).toBeLessThan(pair.below);
      });
    }
  }
});

// ---------- Result colours: the bars pollCard.js draws on the card ----------

interface BarColors { fill: string; track: string; inkOnTrack: string; inkOnFill: string }
type BarColorsOf = (hex: string) => Record<Scheme, BarColors>;

// The track tints m3-tokens.css sets, which pollCard.js reads once on load.
function trackTintToken(name: string): string {
  const match = new RegExp(`${name}:\\s*([0-9.]+%)\\s*;`).exec(tokens);
  if (!match) throw new Error(`${name} is not set in m3-tokens.css`);
  return match[1]!;
}
const TRACK_TINTS = { light: trackTintToken("--bar-track-tint"), dark: trackTintToken("--bar-track-tint-dark") };

// How far a track must stand from the card, per scheme, from m3-tokens.css (the house rule's value).
function trackContrastToken(name: string): number {
  const match = new RegExp(`${name}:\\s*([0-9.]+)\\s*;`).exec(tokens);
  if (!match) throw new Error(`${name} is not set in m3-tokens.css`);
  return Number(match[1]);
}
const TRACK_CONTRAST: Record<Scheme, number> = { light: trackContrastToken("--bar-track-contrast"), dark: trackContrastToken("--bar-track-contrast-dark") };

function loadBarColors(): BarColorsOf {
  const style = `<style>:root{ --bar-track-tint:${TRACK_TINTS.light}; --bar-track-tint-dark:${TRACK_TINTS.dark}; --bar-track-contrast:${TRACK_CONTRAST.light}; --bar-track-contrast-dark:${TRACK_CONTRAST.dark}; }</style>`;
  const { window } = new JSDOM(`<!doctype html><html><head>${style}</head><body></body></html>`, { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true });
  window.eval(pollCardScript);
  const read = (window as unknown as { barTrackTints: () => { light: number; dark: number; contrast: number; contrastDark: number } }).barTrackTints();
  if (Math.abs(read.light * 100 - parseFloat(TRACK_TINTS.light)) > 1e-9 || Math.abs(read.dark * 100 - parseFloat(TRACK_TINTS.dark)) > 1e-9
    || read.contrast !== TRACK_CONTRAST.light || read.contrastDark !== TRACK_CONTRAST.dark) {
    throw new Error(`pollCard.js read ${JSON.stringify(read)}, m3-tokens.css sets ${JSON.stringify({ ...TRACK_TINTS, contrast: TRACK_CONTRAST })}`);
  }
  const barColorsOf = (window as unknown as { barColorsOf: (hex: string) => { light: BarColors; dark: BarColors } }).barColorsOf;
  return (hex) => {
    const { light, dark } = barColorsOf(hex);
    return { light, dark };
  };
}

const paletteBlock = pollCardScript.slice(pollCardScript.indexOf("RESULTS_PALETTE_ENTRIES = ["));
const basePalette = (paletteBlock.slice(0, paletteBlock.indexOf("];")).match(/#[0-9A-Fa-f]{6}/g) ?? []).map((hex) => hex.toUpperCase());
const resultColors = [...new Set([
  ...basePalette,
  constantOf("SEMANTIC_AFFIRMATIVE_COLOR")!,
  constantOf("SEMANTIC_NEGATIVE_COLOR")!,
  ...BAR_PALETTE.map((c) => c.hex.toUpperCase()),
  "#FFFFFF", "#000000", "#FFFF00", "#E0E0E0", "#E3E335"
])];

// CIE76 colour difference over CIELAB (D65): https://en.wikipedia.org/wiki/Color_difference#CIE76
function labOf(hex: string): [number, number, number] {
  const linear = [0, 1, 2].map((i) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  const [r, g, b] = linear;
  const xyz = [
    (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047,
    0.2126 * r + 0.7152 * g + 0.0722 * b,
    (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  ].map((t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)) as [number, number, number];
  return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])];
}

function deltaE(a: string, b: string): number {
  const [la, aa, ba] = labOf(a);
  const [lb, ab, bb] = labOf(b);
  return Math.hypot(la - lb, aa - ab, ba - bb);
}

const MIN_PALETTE_DELTA_E = 13;

describe("COLOR-CONTRAST.md: result colours", () => {
  const barColorsOf = loadBarColors();

  it("draws each Light palette colour, Yes and No in Dark from their Dark twins, and any other colour from itself", () => {
    const { window } = new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true });
    window.eval(pollCardScript);
    const darkTwinOf = (window as unknown as { PollCard: { darkTwinOf: (hex: string) => string } }).PollCard.darkTwinOf;
    const darkBlock = pollCardScript.slice(pollCardScript.indexOf("RESULTS_PALETTE_ENTRIES_DARK = ["));
    const darkPalette = (darkBlock.slice(0, darkBlock.indexOf("]")).match(/#[0-9A-Fa-f]{6}/g) ?? []).map((hex) => hex.toUpperCase());
    expect(darkPalette).toHaveLength(basePalette.length);
    basePalette.forEach((hex, i) => {
      expect(darkTwinOf(hex).toUpperCase(), hex).toBe(darkPalette[i]);
      expect(darkTwinOf(hex.toLowerCase()).toUpperCase(), hex).toBe(darkPalette[i]);
    });
    expect(darkTwinOf(constantOf("SEMANTIC_AFFIRMATIVE_COLOR")!).toUpperCase()).toBe(constantOf("SEMANTIC_AFFIRMATIVE_COLOR_DARK"));
    expect(darkTwinOf(constantOf("SEMANTIC_NEGATIVE_COLOR")!).toUpperCase()).toBe(constantOf("SEMANTIC_NEGATIVE_COLOR_DARK"));
    expect(darkTwinOf("#123456")).toBe("#123456");
    expect(readFileSync(path.resolve("src/public/lineGraph.js"), "utf8")).toContain("window.PollCard.darkTwinOf(stored)");
  });

  it("draws white text on the Dark colours darkened for it, and black on mediumspringgreen, which was left bright", () => {
    // Light colour → its Dark twin, darkened until white reaches 4.5:1.
    const whiteInDark: Record<string, string> = {
      "#006120": "#00872C", "#EC0606": "#EC0606", "#880015": "#D900B6", "#0808FD": "#006EFE",
      "#B045B0": "#C434C4", "#FF6601": "#C84F00", "#7B7924": "#4F8400"
    };
    for (const [light, dark] of Object.entries(whiteInDark)) {
      const drawn = barColorsOf(light).dark;
      expect(drawn.fill.toUpperCase(), light).toBe(dark);
      expect(drawn.inkOnFill.toUpperCase(), light).toBe("#FFFFFF");
    }
    const teal = barColorsOf("#007A7E").dark;
    expect(teal.fill.toUpperCase()).toBe("#02F2A4");
    expect(teal.inkOnFill.toUpperCase()).toBe("#000000");
  });

  it("draws white text on No and olive in Light, both darkened for it", () => {
    for (const hex of ["#EC0606", "#7B7924"]) {
      const drawn = barColorsOf(hex).light;
      expect(drawn.fill.toUpperCase(), hex).toBe(hex);
      expect(drawn.inkOnFill.toUpperCase(), hex).toBe("#FFFFFF");
    }
    expect(constantOf("SEMANTIC_NEGATIVE_COLOR")).toBe("#EC0606");
    expect(RESULTS_PALETTE.find((c) => c.name === "olive")?.hex).toBe("#7B7924");
  });

  it("covers the base palette, Yes/No and the creator swatches", () => {
    expect(basePalette).toEqual(RESULTS_PALETTE.map((c) => c.hex.toUpperCase()));
    expect(resultColors.length).toBeGreaterThan(20);
  });

  for (const scheme of SCHEMES) {
    for (const hex of resultColors) {
      it(`${scheme}: ${hex} draws a fill ≥ 3, a track ≥ ${TRACK_CONTRAST[scheme]}, ink ≥ 7 on the track and ≥ 4.5 on the fill`, () => {
        const card = resolve("--paper-raised", scheme);
        const { fill, track, inkOnTrack, inkOnFill } = barColorsOf(hex)[scheme];
        expect(contrast(fill, card), `fill ${fill} on card ${card}`).toBeGreaterThanOrEqual(3);
        expect(contrast(track, card), `track ${track} on card ${card}`).toBeGreaterThanOrEqual(TRACK_CONTRAST[scheme]);
        expect(contrast(inkOnTrack, track), `ink ${inkOnTrack} on track ${track}`).toBeGreaterThanOrEqual(7);
        expect(contrast(inkOnFill, fill), `ink ${inkOnFill} on fill ${fill}`).toBeGreaterThanOrEqual(4.5);
      });
    }

    it(`${scheme}: no two base palette colours, as drawn, are closer than ΔE ${MIN_PALETTE_DELTA_E}`, () => {
      const drawn = basePalette.map((hex) => ({ hex, fill: barColorsOf(hex)[scheme].fill }));
      for (const [i, a] of drawn.entries()) {
        for (const b of drawn.slice(i + 1)) {
          expect(deltaE(a.fill, b.fill), `${a.hex} (${a.fill}) and ${b.hex} (${b.fill})`).toBeGreaterThanOrEqual(MIN_PALETTE_DELTA_E);
        }
      }
    });
  }
});

describe("CrowdPoll green shades", () => {
  const PERCENTS = [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const serverShade = (n: number) => (brandColors as Record<string, string>)[`CROWDPOLL_GREEN_${n}_PERCENT`];

  it("defines each shade once in m3-tokens.css, as src/brandColors.ts holds it", () => {
    for (const n of PERCENTS) {
      const name = `--crowdpoll-green-${n}-percent`;
      expect(tokens.match(new RegExp(`${name}:`, "g")), name).toHaveLength(1);
      expect(resolve(name, "light"), name).toBe(serverShade(n));
      expect(resolve(name, "dark"), name).toBe(serverShade(n));
    }
    expect(Object.keys(brandColors).sort()).toEqual(PERCENTS.map((n) => `CROWDPOLL_GREEN_${n}_PERCENT`).sort());
  });

  it("spells a shade's hex only where it is defined", () => {
    const hexes = PERCENTS.map(serverShade).map((hex) => hex!.toUpperCase());
    const sheets = readdirSync(publicDir).filter((name) => name.endsWith(".css"));
    for (const name of sheets) {
      const lines = stripComments(read(path.join(publicDir, name))).split(/\r?\n/);
      for (const line of lines) {
        if (name === "m3-tokens.css" && /^\s*--crowdpoll-green-\d+-percent:/.test(line)) continue;
        for (const hex of hexes) expect(line.toUpperCase(), `${name}: ${line.trim()}`).not.toContain(hex);
      }
    }
    expect(read(path.join(root, "src/email/templates.ts")).toUpperCase()).not.toMatch(new RegExp(hexes.join("|")));
  });

  it("names the shades in the roles that use them", () => {
    expect(resolve("--md-sys-color-primary", "light")).toBe(brandColors.CROWDPOLL_GREEN_100_PERCENT);
    expect(tokens).toContain("--md-sys-color-primary:var(--crowdpoll-green-100-percent);");
    expect(tokens).toContain("--md-sys-color-inverse-primary:var(--crowdpoll-green-100-percent);");
    expect(tokens).toContain("--icon-button-background:var(--crowdpoll-green-30-percent);");
  });
});
