export interface BarPaletteColor {
  name: string;
  hex: string;
}

/**
 * The automatic palette, in the order the cards hand it out: neighbouring bars do not clash.
 * src/public/pollCard.js holds the same list as RESULTS_PALETTE_ENTRIES; tests/bar-palette.test.ts keeps the two in step.
 */
export const RESULTS_PALETTE: readonly BarPaletteColor[] = [
  { name: "maroon", hex: "#880015" },
  { name: "mediumvioletred", hex: "#C8468B" },
  { name: "blue", hex: "#0808FD" },
  { name: "darkslateblue", hex: "#1A539E" },
  { name: "dodgerblue", hex: "#0695F5" },
  { name: "darkcyan", hex: "#399FA2" },
  { name: "mediumorchid", hex: "#B045B0" },
  { name: "black", hex: "#000000" },
  { name: "darkslategray", hex: "#404040" },
  { name: "gray", hex: "#7D7D7D" },
  { name: "purple", hex: "#800080" },
  { name: "orangered", hex: "#FF6601" },
  { name: "teal", hex: "#007A7E" },
  { name: "olive", hex: "#7B7924" },
  { name: "peru", hex: "#DB9044" }
];

/** The Yes and No colours (SEMANTIC_AFFIRMATIVE_COLOR and SEMANTIC_NEGATIVE_COLOR in pollCard.js). */
export const AFFIRMATIVE_COLOR: BarPaletteColor = { name: "darkgreen", hex: "#006120" };
export const NEGATIVE_COLOR: BarPaletteColor = { name: "red", hex: "#EC0606" };

/**
 * The Dark scheme's palette: entry i is drawn in Dark wherever entry i of RESULTS_PALETTE would be. Colours are
 * stored and checked as the Light hex; this list only tells the creator's picker what Dark voters see.
 * src/public/pollCard.js holds the same list as RESULTS_PALETTE_ENTRIES_DARK; tests/bar-palette.test.ts keeps the two in step.
 */
export const RESULTS_PALETTE_DARK: readonly BarPaletteColor[] = [
  { name: "mediumvioletred", hex: "#D900B6" },
  { name: "hotpink", hex: "#FF82C8" },
  { name: "royalblue", hex: "#006EFE" },
  { name: "blueviolet", hex: "#5353FE" },
  { name: "deepskyblue", hex: "#00D4FF" },
  { name: "darkturquoise", hex: "#00C1C7" },
  { name: "mediumorchid", hex: "#C434C4" },
  { name: "darkgray", hex: "#9E9E9E" },
  { name: "gainsboro", hex: "#E0E0E0" },
  { name: "yellow", hex: "#FFF500" },
  { name: "plum", hex: "#C8A8FF" },
  { name: "chocolate", hex: "#C84F00" },
  { name: "mediumspringgreen", hex: "#02F2A4" },
  { name: "olivedrab", hex: "#4F8400" },
  { name: "gold", hex: "#FFD201" }
];

/** The Yes and No colours for DARK MODE (SEMANTIC_AFFIRMATIVE_COLOR_DARK and SEMANTIC_NEGATIVE_COLOR_DARK in pollCard.js). */
export const AFFIRMATIVE_COLOR_DARK: BarPaletteColor = { name: "forestgreen", hex: "#00872C" };
export const NEGATIVE_COLOR_DARK: BarPaletteColor = { name: "red", hex: "#EC0606" };


/** The creator's palette: the Yes and No colours, then the automatic palette. */
export const BAR_PALETTE: readonly BarPaletteColor[] = [AFFIRMATIVE_COLOR, NEGATIVE_COLOR, ...RESULTS_PALETTE];

/** The creator's palette in Dark, entry for entry. */
export const BAR_PALETTE_DARK: readonly BarPaletteColor[] = [AFFIRMATIVE_COLOR_DARK, NEGATIVE_COLOR_DARK, ...RESULTS_PALETTE_DARK];

/** The creator's palette as sent to the browser: each colour with the hex it is drawn as in Dark. */
export const SERVED_BAR_PALETTE: readonly (BarPaletteColor & { darkHex: string })[] =
  BAR_PALETTE.map((c, i) => ({ ...c, darkHex: BAR_PALETTE_DARK[i]?.hex ?? c.hex }));

const SIX_DIGIT_HEX = /^#[0-9A-Fa-f]{6}$/;

export function normalizeColor(value: unknown): string | undefined {
  return typeof value === "string" && SIX_DIGIT_HEX.test(value) ? value.toUpperCase() : undefined;
}

export function isPaletteColor(value: unknown): boolean {
  const hex = normalizeColor(value);
  return hex !== undefined && BAR_PALETTE.some((c) => c.hex === hex);
}
