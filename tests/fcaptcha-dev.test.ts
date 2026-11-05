import { describe, expect, it } from "vitest";
import { devEnv } from "../devScripts/fcaptcha-dev.js";

let counter = 0;
const randomHex = () => `generated-${++counter}`;

describe("npm run fcaptcha's environment", () => {
  it("defaults the site key, host and port, and generates both secrets", () => {
    const { env, generatedVerifySecret } = devEnv({}, randomHex);
    expect(env.ENV_FCAPTCHA_SITE_KEYS).toBe("dev");
    expect(env.ENV_FCAPTCHA_ALLOWED_HOSTNAMES).toBe("localhost");
    expect(env.ENV_FCAPTCHA_PORT).toBe("3001");
    expect(env.ENV_FCAPTCHA_SECRET).toMatch(/^generated-/);
    expect(env.ENV_FCAPTCHA_VERIFY_SECRET).toBe(generatedVerifySecret);
    expect(env.ENV_FCAPTCHA_VERIFY_SECRET).not.toBe(env.ENV_FCAPTCHA_SECRET);
  });

  it("keeps every setting already in the session and reports no generated verify secret", () => {
    const session = {
      ENV_FCAPTCHA_SITE_KEYS: "k",
      ENV_FCAPTCHA_ALLOWED_HOSTNAMES: "example.test",
      ENV_FCAPTCHA_PORT: "4000",
      ENV_FCAPTCHA_SECRET: "s".repeat(64),
      ENV_FCAPTCHA_VERIFY_SECRET: "v".repeat(64)
    };
    const { env, generatedVerifySecret } = devEnv(session, randomHex);
    expect(env).toMatchObject(session);
    expect(generatedVerifySecret).toBeUndefined();
  });
});
