import { describe, expect, it } from "vitest";
import { ownTypeError, TYPE_NAMES, typeNamed } from "../../../devScripts/extract/graphTypeNames.js";

const SUPPORTED = "supported: polymarket yes no, polymarket line graph, cnn line graph, politico line graph";

describe("typeNamed", () => {
  it("accepts each of the four names in any case and with surrounding spaces", () => {
    for (const name of TYPE_NAMES) {
      expect(typeNamed(name)).toBe(name);
      expect(typeNamed(`  ${name.toUpperCase()} `)).toBe(name);
    }
    expect(typeNamed(" Polymarket Yes No ")).toBe("polymarket yes no");
  });

  it("rejects any other value with the supported names", () => {
    expect(() => typeNamed("bar chart")).toThrow(`unsupported type "bar chart"; ${SUPPORTED}`);
    expect(() => typeNamed("polymarket")).toThrow(`unsupported type "polymarket"; ${SUPPORTED}`);
  });
});

describe("ownTypeError", () => {
  it("names the command, its own type and extract-all", () => {
    expect(ownTypeError("cnn line graph", "extract-polymarket-yes-no.js", "polymarket yes no")).toBe(
      "type \"cnn line graph\" is not supported by extract-polymarket-yes-no.js; it extracts \"polymarket yes no\"; use extract-all for other types",
    );
  });
});
