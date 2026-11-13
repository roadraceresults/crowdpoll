import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { topLeftAlpha } from "../devScripts/favicon-ico.js";

const emailLogo = () => readFileSync(path.resolve("src/public/email-logo.png"));

describe("The email logo", () => {
  it("is 168 × 168 px, 56 px at 3x", () => {
    const png = emailLogo();
    expect(png.readUInt32BE(16)).toBe(168);
    expect(png.readUInt32BE(20)).toBe(168);
  });

  it("has a transparent background", () => {
    expect(topLeftAlpha(emailLogo())).toBe(0);
  });

  it("refuses a PNG without an alpha channel", () => {
    const opaquePreview = readFileSync(path.resolve("src/public/og-image.png"));
    expect(() => topLeftAlpha(opaquePreview)).toThrow("The email logo is not an 8-bit RGBA PNG");
  });
});
