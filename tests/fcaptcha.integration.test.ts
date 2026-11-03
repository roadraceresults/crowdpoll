import { describe, expect, it } from "vitest";
import { createHumanCheck } from "../src/auth/humanCheck.js";

const url = process.env.FCAPTCHA_TEST_URL;
const verifySecret = process.env.FCAPTCHA_TEST_VERIFY_SECRET;

describe.skipIf(!url || !verifySecret)("the human check against FCAPTCHA_TEST_URL", () => {
  const check = () => createHumanCheck({ url: url!.replace(/\/$/, ""), siteKey: "integration", verifySecret: verifySecret! }, "http://localhost");

  it("reaches the service", async () => {
    expect(await check().isReachable()).toBe(true);
  });

  it("refuses a made-up pass", async () => {
    expect(await check().verify("made-up-token", ["login"], undefined)).toBe("invalid");
  });

  it("refuses everything when the verify secret is wrong", async () => {
    const wrong = createHumanCheck({ url: url!.replace(/\/$/, ""), siteKey: "integration", verifySecret: "wrong" }, "http://localhost");
    expect(await wrong.verify("made-up-token", ["login"], undefined)).toBe("invalid");
  });
});
