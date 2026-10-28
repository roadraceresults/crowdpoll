/**
 * Apple's client secret (research R5, FR-005): an ES256 JWT CrowdPoll signs itself, re-signed every 30 days
 * into the options object the Apple provider reads at each code exchange.
 */
import { createVerify, generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APPLE_SECRET_LIFETIME_SECONDS,
  appleClientSecret,
  startAppleSecretRefresh
} from "../src/auth/appleSecret.js";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const SETTINGS = {
  clientId: "vote.crowdpoll.signin",
  teamId: "TEAM123456",
  keyId: "KEY1234567",
  privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString()
};

const decode = (segment: string) => JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("appleClientSecret", () => {
  it("is an ES256 JWT with Apple's claims, valid for 180 days", () => {
    const now = new Date("2026-10-22T12:00:00Z");
    const [header, claims] = appleClientSecret(SETTINGS, now).split(".");
    expect(decode(header!)).toEqual({ alg: "ES256", kid: "KEY1234567" });
    const iat = now.getTime() / 1000;
    expect(decode(claims!)).toEqual({
      iss: "TEAM123456",
      iat,
      exp: iat + APPLE_SECRET_LIFETIME_SECONDS,
      aud: "https://appleid.apple.com",
      sub: "vote.crowdpoll.signin"
    });
    expect(APPLE_SECRET_LIFETIME_SECONDS).toBe(180 * 24 * 60 * 60);
  });

  it("is signed by the key, as a 64-byte raw signature", () => {
    const [header, claims, signature] = appleClientSecret(SETTINGS).split(".");
    const raw = Buffer.from(signature!, "base64url");
    expect(raw).toHaveLength(64);
    const valid = createVerify("SHA256")
      .update(`${header}.${claims}`)
      .verify({ key: publicKey, dsaEncoding: "ieee-p1363" }, raw);
    expect(valid).toBe(true);
  });
});

describe("startAppleSecretRefresh", () => {
  it("writes a new secret into the provider's options on each interval and logs its expiry", () => {
    vi.useFakeTimers({ now: new Date("2026-10-22T12:00:00Z") });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const options = { clientSecret: appleClientSecret(SETTINGS) };
    const first = options.clientSecret;
    const stop = startAppleSecretRefresh(options, SETTINGS, 1000);

    vi.advanceTimersByTime(1000);
    expect(options.clientSecret).not.toBe(first);
    expect(decode(options.clientSecret.split(".")[1]!).iat).toBe(Date.parse("2026-10-22T12:00:01Z") / 1000);
    expect(log).toHaveBeenCalledWith("[auth] Apple client secret valid until 2027-04-20");

    stop();
    const second = options.clientSecret;
    vi.advanceTimersByTime(5000);
    expect(options.clientSecret).toBe(second);
  });
});
