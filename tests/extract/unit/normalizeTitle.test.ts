import { describe, expect, it } from "vitest";
import { normalizeTitle } from "../../../devScripts/extract/normalizeTitle.js";

describe("normalizeTitle", () => {
  it("turns typographic apostrophes and quotes into straight ones", () => {
    expect(normalizeTitle("Macron‘s’ ‚‛")).toBe("Macron's' ''");
    expect(normalizeTitle("“yes” „no‟")).toBe("\"yes\" \"no\"");
  });

  it("turns dash variants into a hyphen", () => {
    expect(normalizeTitle("a‒b–c—d―e−f")).toBe("a-b-c-d-e-f");
  });

  it("collapses whitespace runs and trims the ends", () => {
    expect(normalizeTitle("  France \t —  approval \n")).toBe("France - approval");
  });
});
