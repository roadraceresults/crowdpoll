import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const PUBLIC = path.resolve("src/public");
const PAGES = readdirSync(PUBLIC)
  .filter((file) => /\.(js|html)$/.test(file))
  .map((file) => path.join(PUBLIC, file));
const OLD_WORDING = /\b(?:sign|signs|signed|signing)[ -]ins?\b/i;

/** The three providers' own button wording, and BetterAuth's routes, are not ours to change. */
const withoutExceptions = (text: string) =>
  text.replace(/Sign in with (?:Google|Apple|Microsoft)\b/g, "").replace(/\/sign-in\//g, "");

describe("the site says Log in", () => {
  for (const file of [...PAGES, path.resolve("src/email/templates.ts")]) {
    it(`has no other wording in ${path.basename(file)}`, () => {
      expect(withoutExceptions(readFileSync(file, "utf8"))).not.toMatch(OLD_WORDING);
    });
  }
});
