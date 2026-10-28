import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = path.resolve("src/public");
const shipped = readdirSync(publicDir).filter((name) => /\.(html|js)$/.test(name));

const FIRST_PERSON = [
  /\bMy (Private )?Polls\b/,
  /\bShared with me\b/i,
  /\bEmail me\b/i,
  /\bFavou?rites?\b/,
  /\b(Add to|Remove from) Favou?rites\b/
];

describe("the interface speaks to the user as you", () => {
  it("ships no first-person label, and no Favorites wording, in any page or script", () => {
    const offences: string[] = [];
    for (const name of shipped) {
      const lines = readFileSync(path.join(publicDir, name), "utf8").split("\n");
      lines.forEach((line, i) => {
        const text = line.replace(/\/\/.*$/, "").replace(/<!--.*?-->/g, "");
        for (const pattern of FIRST_PERSON) if (pattern.test(text)) offences.push(`${name}:${i + 1} ${pattern}`);
      });
    }
    expect(offences).toEqual([]);
  });
});
