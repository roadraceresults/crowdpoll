/**
 * Site Settings FR-011a: the M3 colour roles meet WCAG 2.2 AA contrast in both schemes, so every page built
 * from them does too. Parses the Light `:root` block and the `:root[data-theme="dark"]` block of m3-tokens.css.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve("src/public/m3-tokens.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`\n${selector}{`);
  if (start < 0) throw new Error(`No ${selector} block`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("\n}", start));
  const roles: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/--md-sys-color-([a-z-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) roles[name!] = value!;
  return roles;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const TEXT_PAIRS: [string, string][] = [
  ["on-surface", "surface"],
  ["on-surface", "surface-container-low"],
  ["on-surface", "surface-container"],
  ["on-surface", "surface-container-high"],
  ["on-surface", "surface-container-highest"],
  ["on-surface-variant", "surface"],
  ["on-primary", "primary"],
  ["on-secondary", "secondary"],
  ["on-tertiary", "tertiary"],
  ["on-error", "error"],
  ["on-primary-container", "primary-container"],
  ["on-secondary-container", "secondary-container"],
  ["on-tertiary-container", "tertiary-container"],
  ["error", "surface"],
  ["inverse-on-surface", "inverse-surface"]
];

const NON_TEXT_PAIRS: [string, string][] = [
  ["outline", "surface"],
  ["primary", "surface"]
];

describe.each([
  ["Light", ":root"],
  ["Dark", ':root[data-theme="dark"]']
])("%s colour roles (FR-011a)", (_scheme, selector) => {
  const roles = block(selector);

  it.each(TEXT_PAIRS)("%s on %s reaches 4.5:1", (fg, bg) => {
    expect(roles[fg], fg).toBeDefined();
    expect(roles[bg], bg).toBeDefined();
    expect(contrast(roles[fg]!, roles[bg]!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(NON_TEXT_PAIRS)("%s on %s reaches 3:1", (fg, bg) => {
    expect(contrast(roles[fg]!, roles[bg]!)).toBeGreaterThanOrEqual(3);
  });
});
