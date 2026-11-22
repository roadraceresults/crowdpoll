/**
 * COLOR-CONTRAST.md is this test's data: every Frozen colours row keeps its values and every
 * Required pairs row reaches its minimum, in each scheme, with the colours m3-tokens.css sets.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { BAR_PALETTE } from "../src/polls/barPalette.js";

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

function loadBarColors(): BarColorsOf {
  const { window } = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true });
  window.eval(pollCardScript);
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

  it("covers the base palette, Yes/No and the creator swatches", () => {
    expect(basePalette).toHaveLength(14);
    expect(resultColors.length).toBeGreaterThan(20);
  });

  for (const scheme of SCHEMES) {
    for (const hex of resultColors) {
      it(`${scheme}: ${hex} draws a fill ≥ 3, a track ≥ 1.5, ink ≥ 7 on the track and ≥ 4.5 on the fill`, () => {
        const card = resolve("--paper-raised", scheme);
        const { fill, track, inkOnTrack, inkOnFill } = barColorsOf(hex)[scheme];
        expect(contrast(fill, card), `fill ${fill} on card ${card}`).toBeGreaterThanOrEqual(3);
        expect(contrast(track, card), `track ${track} on card ${card}`).toBeGreaterThanOrEqual(1.5);
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
