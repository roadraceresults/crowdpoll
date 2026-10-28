/**
 * Social sign-in settings (research R1, R2, R4; FR-003): one public origin, three sign-in modes, and a
 * provider that is on only when every one of its settings is set.
 */
import { describe, expect, it } from "vitest";
import { loadConfig, ConfigError } from "../src/config.js";

const SECRET = "test-secret-0123456789-0123456789-0123456789";
const ORIGIN = "https://crowdpoll.vote";

const GOOGLE = { ENV_OAUTH_GOOGLE_CLIENT_ID: "g-id", ENV_OAUTH_GOOGLE_CLIENT_SECRET: "g-secret" };
const MICROSOFT = { ENV_OAUTH_MICROSOFT_CLIENT_ID: "m-id", ENV_OAUTH_MICROSOFT_CLIENT_SECRET: "m-secret" };
const AMAZON = { ENV_OAUTH_AMAZON_CLIENT_ID: "a-id", ENV_OAUTH_AMAZON_CLIENT_SECRET: "a-secret" };
const APPLE = {
  ENV_OAUTH_APPLE_CLIENT_ID: "vote.crowdpoll.signin",
  ENV_OAUTH_APPLE_TEAM_ID: "TEAM123456",
  ENV_OAUTH_APPLE_KEY_ID: "KEY1234567",
  ENV_OAUTH_APPLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----"
};

function env(overrides: Record<string, string | undefined> = {}) {
  return { ENV_BETTER_AUTH_SECRET: SECRET, ENV_PUBLIC_ORIGIN: ORIGIN, ...overrides };
}

describe("ENV_PUBLIC_ORIGIN (R1)", () => {
  it("is required", () => {
    expect(() => loadConfig(env({ ENV_PUBLIC_ORIGIN: undefined }))).toThrow(/ENV_PUBLIC_ORIGIN/);
    expect(() => loadConfig(env({ ENV_PUBLIC_ORIGIN: "" }))).toThrow(ConfigError);
  });

  it("is read as an origin, a trailing slash allowed", () => {
    expect(loadConfig(env()).publicOrigin).toBe(ORIGIN);
    expect(loadConfig(env({ ENV_PUBLIC_ORIGIN: "https://crowdpoll.vote/" })).publicOrigin).toBe(ORIGIN);
    expect(loadConfig(env({ ENV_PUBLIC_ORIGIN: "http://localhost:8080" })).publicOrigin).toBe("http://localhost:8080");
  });

  it("refuses a path, another scheme or a non-URL", () => {
    for (const bad of ["https://crowdpoll.vote/app", "ftp://crowdpoll.vote", "crowdpoll.vote", "not a url"]) {
      expect(() => loadConfig(env({ ENV_PUBLIC_ORIGIN: bad }))).toThrow(/ENV_PUBLIC_ORIGIN/);
    }
  });
});

describe("ENV_SIGNIN_METHOD (R2)", () => {
  it("derives nativeSignin and oauthSignin from each mode", () => {
    expect(loadConfig(env())).toMatchObject({ signinMethod: "native", nativeSignin: true, oauthSignin: false });
    expect(loadConfig(env({ ENV_SIGNIN_METHOD: "oauth", ...GOOGLE }))).toMatchObject({
      signinMethod: "oauth",
      nativeSignin: false,
      oauthSignin: true
    });
    expect(loadConfig(env({ ENV_SIGNIN_METHOD: "both", ...GOOGLE }))).toMatchObject({
      signinMethod: "both",
      nativeSignin: true,
      oauthSignin: true
    });
  });

  it("refuses any other value", () => {
    expect(() => loadConfig(env({ ENV_SIGNIN_METHOD: "social" }))).toThrow(/ENV_SIGNIN_METHOD/);
  });
});

describe("sign-in providers (R4, FR-003)", () => {
  it("are off in native mode, even when set", () => {
    expect(loadConfig(env(GOOGLE)).oauthProviders).toEqual({});
  });

  it("turns on each provider whose settings are all set, in display order", () => {
    const config = loadConfig(env({ ENV_SIGNIN_METHOD: "both", ...AMAZON, ...MICROSOFT, ...APPLE, ...GOOGLE }));
    expect(Object.keys(config.oauthProviders)).toEqual(["google", "apple", "microsoft", "amazon"]);
    expect(config.oauthProviders.google).toEqual({ clientId: "g-id", clientSecret: "g-secret" });
    expect(config.oauthProviders.microsoft).toEqual({ clientId: "m-id", clientSecret: "m-secret" });
    expect(config.oauthProviders.amazon).toEqual({ clientId: "a-id", clientSecret: "a-secret" });
    expect(config.oauthProviders.apple).toMatchObject({
      clientId: "vote.crowdpoll.signin",
      teamId: "TEAM123456",
      keyId: "KEY1234567"
    });
  });

  it("reads the Apple private key's \\n pairs as line breaks", () => {
    const config = loadConfig(env({ ENV_SIGNIN_METHOD: "oauth", ...APPLE }));
    expect(config.oauthProviders.apple?.privateKey).toBe(
      "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----"
    );
  });

  it("refuses a partial provider, naming it and the missing setting", () => {
    const partial = { ...APPLE, ENV_OAUTH_APPLE_KEY_ID: undefined };
    expect(() => loadConfig(env({ ENV_SIGNIN_METHOD: "oauth", ...GOOGLE, ...partial }))).toThrow(ConfigError);
    expect(() => loadConfig(env({ ENV_SIGNIN_METHOD: "oauth", ...GOOGLE, ...partial }))).toThrow(
      "Incomplete Apple sign-in settings: ENV_OAUTH_APPLE_KEY_ID is not set."
    );
    expect(() =>
      loadConfig(env({ ENV_SIGNIN_METHOD: "both", ENV_OAUTH_MICROSOFT_CLIENT_ID: "m-id" }))
    ).toThrow("Incomplete Microsoft sign-in settings: ENV_OAUTH_MICROSOFT_CLIENT_SECRET is not set.");
  });

  it("refuses oauth or both with no provider on", () => {
    expect(() => loadConfig(env({ ENV_SIGNIN_METHOD: "oauth" }))).toThrow(/no sign-in provider/);
    expect(() => loadConfig(env({ ENV_SIGNIN_METHOD: "both" }))).toThrow(ConfigError);
  });

  it("no longer reads the Facebook or GitHub settings", () => {
    const config = loadConfig(
      env({
        ENV_SIGNIN_METHOD: "oauth",
        ...GOOGLE,
        ENV_OAUTH_FACEBOOK_CLIENT_ID: "f",
        ENV_OAUTH_FACEBOOK_CLIENT_SECRET: "f",
        ENV_OAUTH_GITHUB_CLIENT_ID: "h",
        ENV_OAUTH_GITHUB_CLIENT_SECRET: "h"
      })
    );
    expect(Object.keys(config.oauthProviders)).toEqual(["google"]);
    expect(() => loadConfig(env({ ENV_SIGNIN_METHOD: "oauth", ENV_OAUTH_GITHUB_CLIENT_ID: "h", ENV_OAUTH_GITHUB_CLIENT_SECRET: "h" }))).toThrow(
      /no sign-in provider/
    );
  });
});
