/**
 * The human check on the server: every login start refuses a missing or bad pass before doing anything else,
 * and the routes that finish a login already started need none.
 */
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { startTestContext, type TestContext } from "./helpers/setup.js";
import { TERMS_VERSION } from "../src/legal/version.js";

const HUMAN_CHECK_ON = {
  ENV_FCAPTCHA_ENABLED: "1",
  ENV_FCAPTCHA_URL: "http://fcaptcha.test",
  ENV_FCAPTCHA_SITE_KEY: "site-key",
  ENV_FCAPTCHA_VERIFY_SECRET: "verify-secret"
};
const PROVIDERS = {
  ENV_SIGNIN_METHOD: "both",
  ENV_OAUTH_GOOGLE_CLIENT_ID: "google-client",
  ENV_OAUTH_GOOGLE_CLIENT_SECRET: "google-secret",
  ENV_OAUTH_AMAZON_CLIENT_ID: "amazon-client",
  ENV_OAUTH_AMAZON_CLIENT_SECRET: "amazon-secret"
};

interface Answer {
  status?: number;
  body?: Record<string, unknown>;
}

/** FCaptcha's side, server to server. A token's answer is set per test; an unknown token is not valid. */
function fakeFcaptcha() {
  const answers = new Map<string, Answer>();
  const calls: { url: string; body: Record<string, unknown> | null }[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    calls.push({ url, body });
    if (url.endsWith("/health")) return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    const answer = answers.get(String(body?.token)) ?? { body: { valid: false, reason: "invalid_token" } };
    answers.delete(String(body?.token));
    return new Response(JSON.stringify(answer.body ?? {}), { status: answer.status ?? 200 });
  }) as typeof fetch;
  return {
    fetchImpl,
    calls,
    pass(token: string, action = "", hostname = "localhost") {
      answers.set(token, { body: { valid: true, hostname, action, score: 0.1 } });
    }
  };
}

const REFUSED = { error: "Please complete the human check.", code: "challenge-required" };

describe("native login starts with the check on", () => {
  let ctx: TestContext;
  const fcaptcha = fakeFcaptcha();
  let logs: string[];
  beforeAll(async () => {
    ctx = await startTestContext(
      { ...HUMAN_CHECK_ON, ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW: "1" },
      { humanCheckFetch: fcaptcha.fetchImpl }
    );
  });
  afterAll(async () => {
    await ctx.stop();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  const captureLogs = () => {
    logs = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
  };

  const routes = [
    { path: "/api/auth/request-login-link", body: { email: "reader@example.com" }, accepts: "login", refuses: "invite" },
    {
      path: "/api/auth/create-account",
      body: { email: "new@example.com", acceptedTerms: true, termsVersion: TERMS_VERSION },
      accepts: "create-account",
      refuses: "login"
    },
    { path: "/api/invitations/redeem", body: { pid: "3f6c2a9e-4b1d-4e8a-9c7f-1a2b3c4d5e6f", token: "t" }, accepts: "invite", refuses: "login" }
  ];

  for (const route of routes) {
    describe(route.path, () => {
      it("refuses a request without a pass, sending nothing", async () => {
        captureLogs();
        const before = ctx.sent.length;
        const res = await request(ctx.app).post(route.path).set("Origin", "http://localhost:8080").send(route.body);
        expect(res.status).toBe(400);
        expect(res.body).toEqual(REFUSED);
        expect(ctx.sent.length).toBe(before);
        expect(logs.some((line) => line.startsWith(`[human-check] Refused ${route.path} (`))).toBe(true);
        expect(logs.join("\n")).not.toContain("@example.com");
      });

      it("refuses a pass FCaptcha does not vouch for", async () => {
        const res = await request(ctx.app).post(route.path).set("X-Human-Check", "unknown").send(route.body);
        expect(res.body).toEqual(REFUSED);
      });

      it("refuses a pass minted on another site", async () => {
        fcaptcha.pass("foreign", "", "evil.example");
        const res = await request(ctx.app).post(route.path).set("X-Human-Check", "foreign").send(route.body);
        expect(res.body).toEqual(REFUSED);
      });

      it(`refuses a pass minted for another page (${route.refuses})`, async () => {
        fcaptcha.pass("other-page", route.refuses);
        const res = await request(ctx.app).post(route.path).set("X-Human-Check", "other-page").send(route.body);
        expect(res.body).toEqual(REFUSED);
      });

      it("lets a good pass through to the route's own checks", async () => {
        fcaptcha.pass(`good-${route.accepts}`, route.accepts);
        const res = await request(ctx.app)
          .post(route.path)
          .set("X-Human-Check", `good-${route.accepts}`)
          .set("Origin", "http://localhost:8080")
          .send(route.body);
        expect(res.body.code).not.toBe("challenge-required");
      });
    });
  }

  it("sends the token and verify secret, and no client address until binding is on", async () => {
    fcaptcha.pass("inspect", "login");
    await request(ctx.app).post("/api/auth/request-login-link").set("X-Human-Check", "inspect").send({ email: "inspect@example.com" });
    const call = fcaptcha.calls.findLast((c) => c.url === "http://fcaptcha.test/api/token/verify");
    expect(call?.body).toEqual({ token: "inspect", secret: "verify-secret" });
  });

  it("checks before the rate limit: refused requests spend no slot", async () => {
    const email = "limit@example.com";
    for (let i = 0; i < 3; i++) {
      const res = await request(ctx.app).post("/api/auth/request-login-link").set("X-Forwarded-For", "203.0.113.9").send({ email });
      expect(res.body).toEqual(REFUSED);
    }
    fcaptcha.pass("limit", "login");
    const res = await request(ctx.app)
      .post("/api/auth/request-login-link")
      .set("X-Forwarded-For", "203.0.113.9")
      .set("X-Human-Check", "limit")
      .send({ email });
    expect(res.status).toBe(200);
  });

  it("checks before the honeypot", async () => {
    const res = await request(ctx.app).post("/api/auth/request-login-link").send({ email: "bot@example.com", homepage: "x" });
    expect(res.body).toEqual(REFUSED);
  });

  it("asks no pass of the routes that finish a login", async () => {
    const link = await request(ctx.app).post("/api/auth/create-account").send({ token: "not-a-real-link" });
    expect(link.body.code).not.toBe("challenge-required");
    const verify = await request(ctx.app).get("/api/auth/verify?token=nope");
    expect(verify.status).not.toBe(400);
    const confirm = await request(ctx.app).post("/api/auth/confirm-signin").send({ token: "nope" });
    expect(confirm.body.code).not.toBe("challenge-required");
  });
});

describe("the check before the allowlist", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext({ ...HUMAN_CHECK_ON, ENV_ALLOWED_EMAILS: "tester@example.com" }, { humanCheckFetch: fakeFcaptcha().fetchImpl });
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("refuses an address outside the allowlist for the missing pass, saying nothing about the list", async () => {
    const res = await request(ctx.app).post("/api/auth/request-login-link").send({ email: "stranger@example.com" });
    expect(res.body).toEqual(REFUSED);
  });
});

describe("provider login starts with the check on", () => {
  let ctx: TestContext;
  const fcaptcha = fakeFcaptcha();
  beforeAll(async () => {
    ctx = await startTestContext({ ...HUMAN_CHECK_ON, ...PROVIDERS }, { humanCheckFetch: fcaptcha.fetchImpl });
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("refuses sign-in/social and sign-in/oauth2 without a pass", async () => {
    const social = await request(ctx.app).post("/api/auth/sign-in/social").send({ provider: "google", callbackURL: "/" });
    expect(social.status).toBe(400);
    expect(social.body).toEqual(REFUSED);
    const oauth2 = await request(ctx.app).post("/api/auth/sign-in/oauth2").send({ providerId: "amazon", callbackURL: "/" });
    expect(oauth2.body).toEqual(REFUSED);
  });

  it("starts a provider login with a pass from any of the three pages", async () => {
    for (const action of ["login", "create-account", "invite"]) {
      fcaptcha.pass(`social-${action}`, action);
      const res = await request(ctx.app)
        .post("/api/auth/sign-in/social")
        .set("X-Human-Check", `social-${action}`)
        .send({ provider: "google", callbackURL: "/" });
      expect(res.status).toBe(200);
      expect(typeof res.body.url).toBe("string");
    }
  });

  it("asks no pass of a provider callback", async () => {
    const res = await request(ctx.app).get("/api/auth/callback/google?code=x&state=y");
    expect(res.body?.code).not.toBe("challenge-required");
  });
});

describe("the check off", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await startTestContext();
  });
  afterAll(async () => {
    await ctx.stop();
  });

  it("starts a login with no pass, as before", async () => {
    const res = await request(ctx.app).post("/api/auth/request-login-link").send({ email: "reader@example.com" });
    expect(res.status).toBe(200);
  });
});

describe("when FCaptcha cannot be reached", () => {
  let ctx: TestContext;
  let mode: "down" | "timeout" | "error5xx" | "invalid" = "down";
  let healthUp = false;
  let logs: string[];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/health")) {
      if (healthUp) return new Response("{}", { status: 200 });
      throw new TypeError("fetch failed");
    }
    if (mode === "down") throw new TypeError("fetch failed");
    if (mode === "timeout") {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
      });
    }
    if (mode === "error5xx") return new Response("{}", { status: 503 });
    return new Response(JSON.stringify({ valid: false }), { status: 200 });
  }) as typeof fetch;

  beforeAll(async () => {
    ctx = await startTestContext({ ...HUMAN_CHECK_ON, ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW: "100" }, { humanCheckFetch: fetchImpl });
  });
  afterAll(async () => {
    await ctx.stop();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  const captureLogs = () => {
    logs = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
  };
  const skipped = async () => (await request(ctx.app).get("/healthz")).body.abuse.humanCheckSkipped as number;
  const start = (pass?: string) => {
    const req = request(ctx.app).post("/api/auth/request-login-link").set("X-Forwarded-For", "198.51.100.23");
    return (pass ? req.set("X-Human-Check", pass) : req).send({ email: "down@example.com" });
  };

  for (const failure of ["down", "error5xx"] as const) {
    it(`lets a login with a pass go on, counted and logged (${failure})`, async () => {
      mode = failure;
      const before = await skipped();
      captureLogs();
      const res = await start("any-pass");
      expect(res.status).toBe(200);
      expect(await skipped()).toBe(before + 1);
      expect(logs).toContain("[human-check] Skipped: service unreachable (198.51.100.x)");
      expect(logs.join("\n")).not.toContain("any-pass");
    });
  }

  it("gives up on a verify call after three seconds and lets the login go on", async () => {
    mode = "timeout";
    const before = await skipped();
    const started = Date.now();
    const res = await start("slow-pass");
    expect(res.status).toBe(200);
    expect(Date.now() - started).toBeGreaterThanOrEqual(2900);
    expect(await skipped()).toBe(before + 1);
  }, 10_000);

  it("lets a login without a pass go on only while the service is down", async () => {
    healthUp = false;
    const before = await skipped();
    expect((await start()).status).toBe(200);
    expect(await skipped()).toBe(before + 1);
    healthUp = true;
    expect((await start()).body).toEqual(REFUSED);
    expect(await skipped()).toBe(before + 1);
  });

  it("still refuses a pass FCaptcha answers for as not valid, whatever its health says", async () => {
    mode = "invalid";
    healthUp = false;
    expect((await start("bad-pass")).body).toEqual(REFUSED);
  });
});

describe("the local stand-in for the /fcaptcha ingress route", () => {
  /** FCaptcha's side as the browser reaches it: the widget file and its API, recording each forwarded call. */
  function fakeWidgetServer() {
    const calls: { url: string; method: string; origin: string | null; body: string | null }[] = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      const body = init?.body ? Buffer.from(init.body as Uint8Array).toString("utf8") : null;
      calls.push({ url: String(input), method: init?.method ?? "GET", origin: headers.get("origin"), body });
      if (String(input).endsWith("/fcaptcha.js")) return new Response("window.FCaptcha = {};", { status: 200, headers: { "content-type": "application/javascript" } });
      return new Response(JSON.stringify({ challenge: "c1" }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    return { fetchImpl, calls };
  }

  it("forwards /fcaptcha/* to ENV_FCAPTCHA_URL without the prefix on a localhost origin", async () => {
    const fcaptcha = fakeWidgetServer();
    const ctx = await startTestContext(HUMAN_CHECK_ON, { humanCheckFetch: fcaptcha.fetchImpl });
    try {
      const script = await request(ctx.app).get("/fcaptcha/fcaptcha.js");
      expect(script.status).toBe(200);
      expect(script.headers["content-type"]).toMatch(/application\/javascript/);
      expect(script.text).toBe("window.FCaptcha = {};");

      const api = await request(ctx.app)
        .post("/fcaptcha/api/verify?mode=checkbox")
        .set("Origin", "http://localhost:8080")
        .send({ siteKey: "site-key" });
      expect(api.status).toBe(200);
      expect(api.body).toEqual({ challenge: "c1" });

      expect(fcaptcha.calls).toEqual([
        { url: "http://fcaptcha.test/fcaptcha.js", method: "GET", origin: null, body: null },
        { url: "http://fcaptcha.test/api/verify?mode=checkbox", method: "POST", origin: "http://localhost:8080", body: JSON.stringify({ siteKey: "site-key" }) }
      ]);
    } finally {
      await ctx.stop();
    }
  });

  it("is not there on the production origin", async () => {
    const fcaptcha = fakeWidgetServer();
    const ctx = await startTestContext({ ...HUMAN_CHECK_ON, ENV_PUBLIC_ORIGIN: "https://crowdpoll.vote" }, { humanCheckFetch: fcaptcha.fetchImpl });
    try {
      expect((await request(ctx.app).get("/fcaptcha/fcaptcha.js")).status).toBe(404);
      expect(fcaptcha.calls).toEqual([]);
    } finally {
      await ctx.stop();
    }
  });
});
