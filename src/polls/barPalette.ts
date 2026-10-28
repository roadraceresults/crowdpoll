export interface BarPaletteColor {
  name: string;
  hex: string;
}

export const BAR_PALETTE: readonly BarPaletteColor[] = [
  { name: "red", hex: "#F91010" },
  { name: "blue", hex: "#0808FD" },
  { name: "black", hex: "#000000" },
  { name: "darkslategray", hex: "#545454" },
  { name: "darkgray", hex: "#9E9E9E" },
  { name: "gainsboro", hex: "#E0E0E0" },
  { name: "darkred", hex: "#880015" },
  { name: "orangered", hex: "#FF6601" },
  { name: "yellow", hex: "#FFFF00" },
  { name: "greenyellow", hex: "#E3E335" },
  { name: "lime", hex: "#06D400" },
  { name: "darkgreen", hex: "#006120" },
  { name: "teal", hex: "#007A7E" },
  { name: "dodgerblue", hex: "#0695F5" },
  { name: "darkslateblue", hex: "#1A539E" },
  { name: "purple", hex: "#800080" },
  { name: "plum", hex: "#FF91CB" },
  { name: "saddlebrown", hex: "#784315" }
];

const SIX_DIGIT_HEX = /^#[0-9A-Fa-f]{6}$/;

export function normalizeColor(value: unknown): string | undefined {
  return typeof value === "string" && SIX_DIGIT_HEX.test(value) ? value.toUpperCase() : undefined;
}

export function isPaletteColor(value: unknown): boolean {
  const hex = normalizeColor(value);
  return hex !== undefined && BAR_PALETTE.some((c) => c.hex === hex);
}
