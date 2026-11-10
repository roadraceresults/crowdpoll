/**
 * The poll wizard in `src/public/adminCard.js` carries its own copies of the
 * server's length limits, so the two are compared here.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as service from "../src/polls/service.js";
import { NOTES_MAX } from "../src/polls/notes.js";

const adminCard = readFileSync("src/public/adminCard.js", "utf8");

function browserCopy(name: string): number {
  const match = new RegExp(`const ${name} = (\\d+);`).exec(adminCard);
  if (!match) throw new Error(`adminCard.js has no ${name}`);
  return Number(match[1]);
}

describe("field length limits", () => {
  it.each([
    ["TITLE_MAX", service.TITLE_MAX, 60],
    ["SUBTITLE_MAX", service.SUBTITLE_MAX, 40],
    ["CHOICE_LABEL_MAX", service.CHOICE_LABEL_MAX, 35]
  ])("%s is the same in the browser as on the server", (name, serverValue, expected) => {
    expect(serverValue).toBe(expected);
    expect(browserCopy(name)).toBe(serverValue);
  });

  it("NOTES_MAX is the same in the notes editor as on the server", () => {
    expect(NOTES_MAX).toBe(6000);
    const match = /const NOTES_MAX = (\d+);/.exec(readFileSync("src/public/notesEditor.js", "utf8"));
    expect(Number(match?.[1])).toBe(NOTES_MAX);
  });

  it("has one choice-label limit", () => {
    expect(service).not.toHaveProperty("WIZARD_CHOICE_MAX");
  });
});
