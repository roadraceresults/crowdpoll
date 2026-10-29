/**
 * 002-smtp-env-config — configuration contract (FR-002/003/007/008/010):
 * mandatory ≥32-char ENV_BETTER_AUTH_SECRET in every environment, legacy names
 * dead, SMTP settings parsed with fail-fast validation, degraded-email mode
 * warns instead of crashing.
 *
 * 011-SIMPLIFY-POLL-STATES renamed every setting to the ENV_ prefix as a hard
 * cutover (research R6) and added six poll-lifecycle settings.
 */
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig, ConfigError } from "../src/config.js";
import { initMailer } from "../src/email/mailer.js";
import { emailRateLimit } from "../src/auth/auth.js";
import { defaultsUsedLines } from "../src/server.js";

const VALID_SECRET = "test-secret-0123456789-0123456789-0123456789"; // 44 chars

/** Minimal valid env; tests override/delete fields per case. */
function baseEnv(overrides: Record<string, string | undefined> = {}) {
  return { ENV_BETTER_AUTH_SECRET: VALID_SECRET, ENV_PUBLIC_ORIGIN: "http://localhost:8080", ...overrides };
}

describe("ENV_BETTER_AUTH_SECRET (FR-002, FR-010)", () => {
  it("reads the secret from ENV_BETTER_AUTH_SECRET", () => {
    const config = loadConfig(baseEnv());
    expect(config.betterAuthSecret).toBe(VALID_SECRET);
  });

  it("accepts a secret of exactly 32 characters", () => {
    const secret = "x".repeat(32);
    expect(loadConfig(baseEnv({ ENV_BETTER_AUTH_SECRET: secret })).betterAuthSecret).toBe(secret);
  });

  it("ignores every superseded name, with no fallback (011 research R6)", () => {
    // The rename is a hard cutover: the old APP_* names are not read at all, so
    // a half-finished rename fails loudly at startup rather than silently
    // running on stale configuration.
    for (const legacy of ["APP_AUTH_SECRET", "APP_BETTER_AUTH_SECRET"]) {
      expect(() =>
        loadConfig({ [legacy]: VALID_SECRET, ENV_BETTER_AUTH_SECRET: undefined })
      ).toThrow(ConfigError);
    }
    const both = loadConfig(baseEnv({ APP_BETTER_AUTH_SECRET: "legacy-value-legacy-value-legacy" }));
    expect(both.betterAuthSecret).toBe(VALID_SECRET);
  });

  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["31 characters", "x".repeat(31)]
  ])("refuses startup when the secret is %s, naming the variable and minimum", (_label, value) => {
    let thrown: unknown;
    try {
      loadConfig(baseEnv({ ENV_BETTER_AUTH_SECRET: value }));
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(ConfigError);
    const message = (thrown as Error).message;
    expect(message).toContain("ENV_BETTER_AUTH_SECRET");
    expect(message).toContain("32");
  });
});

describe("SMTP settings (FR-003, FR-007)", () => {
  it("applies the documented development defaults", () => {
    const { smtp } = loadConfig(baseEnv());
    expect(smtp.host).toBe("sandbox.smtp.mailtrap.io");
    expect(smtp.port).toBe(2525);
    expect(smtp.user).toBeUndefined();
    expect(smtp.pass).toBeUndefined();
  });

  it("passes configured values through", () => {
    const { smtp } = loadConfig(
      baseEnv({
        ENV_SMTP_HOST: "smtp.example.com",
        ENV_SMTP_PORT: "587",
        ENV_SMTP_USER: "mailer-user",
        ENV_SMTP_PASS: "mailer-pass"
      })
    );
    expect(smtp).toEqual({
      host: "smtp.example.com",
      port: 587,
      user: "mailer-user",
      pass: "mailer-pass"
    });
  });

  it.each([["abc"], ["-1"], ["0"]])(
    "refuses ENV_SMTP_PORT=%s with an error naming the variable",
    (value) => {
      expect(() => loadConfig(baseEnv({ ENV_SMTP_PORT: value }))).toThrow(/ENV_SMTP_PORT/);
    }
  );
});

describe("Email transport, sender and timeout", () => {
  const sesEnv = (overrides: Record<string, string | undefined> = {}) =>
    baseEnv({
      ENV_EMAIL_TRANSPORT: "ses",
      ENV_SES_REGION: "ca-central-1",
      ENV_SES_ACCESS_KEY_ID: "key-id",
      ENV_SES_SECRET_ACCESS_KEY: "secret-key",
      ...overrides
    });

  it("defaults to the smtp transport and accepts ses", () => {
    expect(loadConfig(baseEnv()).emailTransport).toBe("smtp");
    const config = loadConfig(sesEnv());
    expect(config.emailTransport).toBe("ses");
    expect(config.ses).toEqual({ region: "ca-central-1", accessKeyId: "key-id", secretAccessKey: "secret-key" });
  });

  it("rejects any other transport", () => {
    expect(() => loadConfig(baseEnv({ ENV_EMAIL_TRANSPORT: "mailgun" }))).toThrow(/ENV_EMAIL_TRANSPORT/);
  });

  it.each(["ENV_SES_REGION", "ENV_SES_ACCESS_KEY_ID", "ENV_SES_SECRET_ACCESS_KEY"])(
    "refuses ses without %s, naming it",
    (missing) => {
      let thrown: unknown;
      try {
        loadConfig(sesEnv({ [missing]: undefined }));
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(ConfigError);
      expect((thrown as Error).message).toContain(missing);
    }
  );

  it("sends from CrowdPoll by default and ignores ENV_SMTP_FROM", () => {
    expect(loadConfig(baseEnv()).emailFrom).toBe("CrowdPoll <no-reply@mail.crowdpoll.vote>");
    expect(loadConfig(baseEnv({ ENV_SMTP_FROM: "Old <old@example.com>" })).emailFrom).toBe(
      "CrowdPoll <no-reply@mail.crowdpoll.vote>"
    );
    expect(loadConfig(baseEnv({ ENV_EMAIL_FROM: "App <a@example.com>" })).emailFrom).toBe("App <a@example.com>");
  });

  it("is configured for SES in the deployment spec", () => {
    const appYaml = readFileSync(new URL("../.do/app.yaml", import.meta.url), "utf8");
    const entry = (key: string) => new RegExp(`- key: ${key}\\r?\\n((?: {8}.*\\r?\\n)*)`).exec(appYaml)?.[1] ?? "";
    expect(entry("ENV_EMAIL_TRANSPORT")).toMatch(/value: "?ses"?/);
    expect(entry("ENV_SES_REGION")).toMatch(/value: "?ca-central-1"?/);
    expect(entry("ENV_SES_ACCESS_KEY_ID")).toContain("type: SECRET");
    expect(entry("ENV_SES_SECRET_ACCESS_KEY")).toContain("type: SECRET");
  });

  it("reads ENV_EMAIL_ASSET_ORIGIN as an origin, unset by default", () => {
    expect(loadConfig(baseEnv()).emailAssetOrigin).toBeUndefined();
    expect(loadConfig(baseEnv({ ENV_EMAIL_ASSET_ORIGIN: "https://crowdpoll.vote" })).emailAssetOrigin).toBe(
      "https://crowdpoll.vote"
    );
    expect(loadConfig(baseEnv({ ENV_EMAIL_ASSET_ORIGIN: "https://crowdpoll.vote/" })).emailAssetOrigin).toBe(
      "https://crowdpoll.vote"
    );
    for (const bad of ["crowdpoll.vote", "ftp://crowdpoll.vote", "https://crowdpoll.vote/assets"]) {
      expect(() => loadConfig(baseEnv({ ENV_EMAIL_ASSET_ORIGIN: bad }))).toThrow(/ENV_EMAIL_ASSET_ORIGIN/);
    }
  });

  it("development templates send through SES and carry no Mailtrap settings", () => {
    const launchJson = readFileSync(new URL("../launch.json.example", import.meta.url), "utf8");
    const launchPs1 = readFileSync(new URL("../devScripts.example/launch-dev.ps1", import.meta.url), "utf8");
    for (const template of [launchJson, launchPs1]) {
      expect(template).not.toMatch(/ENV_SMTP_(HOST|PORT|USER|PASS)/);
      expect(template).toMatch(/ENV_EMAIL_TRANSPORT"?\s*[:=]\s*"ses"/);
      expect(template).toMatch(/ENV_SES_REGION"?\s*[:=]\s*"us-east-1"/);
      expect(template).toMatch(/ENV_EMAIL_FROM"?\s*[:=]\s*"CrowdPoll <no-reply@dev\.mail\.crowdpoll\.vote>"/);
      expect(template).not.toContain("no-reply@mail.crowdpoll.vote");
      expect(template).toMatch(/ENV_EMAIL_ASSET_ORIGIN"?\s*[:=]\s*"https:\/\/crowdpoll\.vote"/);
      expect(template).toMatch(/ENV_ALLOWED_EMAILS"?\s*[:=]\s*""/);
      expect(template).toContain("ENV_SES_ACCESS_KEY_ID");
      expect(template).toContain("ENV_SES_SECRET_ACCESS_KEY");
    }
  });

  it("bounds a send at 10 seconds by default", () => {
    expect(loadConfig(baseEnv()).emailSendTimeoutMs).toBe(10_000);
    expect(loadConfig(baseEnv({ ENV_EMAIL_SEND_TIMEOUT: "500" })).emailSendTimeoutMs).toBe(500);
    expect(() => loadConfig(baseEnv({ ENV_EMAIL_SEND_TIMEOUT: "0" }))).toThrow(/ENV_EMAIL_SEND_TIMEOUT/);
  });
});

describe("degraded email mode (FR-008)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("missing SMTP credentials warn at startup instead of crashing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => initMailer(loadConfig(baseEnv()))).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("not delivered"));
  });
});

describe("011 poll-lifecycle settings", () => {
  const SETTINGS: [string, keyof ReturnType<typeof loadConfig>, number][] = [
    ["ENV_SCREENING_CALL_TIMEOUT", "screeningCallTimeoutMs", 10_000],
    ["ENV_POLL_APPROVAL_SWEEP_INTERVAL", "pollApprovalSweepIntervalMs", 5_000],
    ["ENV_POLL_DATE_CHECK_SWEEP_INTERVAL", "pollDateCheckSweepIntervalMs", 60_000],
    ["ENV_POLL_EDIT_HEARTBEAT_INTERVAL", "pollEditHeartbeatIntervalMs", 10_000],
    ["ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS", "maxAcceptabilityScreeningAttempts", 10],
    ["ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL", "pollAdminPageRefreshIntervalMs", 5_000],
    ["ENV_PARTICIPANTS_VIEWPORT_SIZE", "participantsViewportSize", 10],
    ["ENV_MIN_CHOICES", "minChoices", 2],
    ["ENV_MAX_CHOICES", "maxChoices", 50]
  ];

  it("applies the documented default for each", () => {
    const config = loadConfig(baseEnv());
    for (const [name, key, expected] of SETTINGS) {
      expect(config[key], name).toBe(expected);
    }
  });

  it("reads each from the environment when set", () => {
    for (const [name, key] of SETTINGS) {
      const env = baseEnv({ [name]: "7" });
      if (name === "ENV_SERVER_MAX_REQUESTS_PER_SECOND") env.ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND = "7";
      expect(loadConfig(env)[key], name).toBe(7);
    }
  });

  it("rejects a non-positive or non-integer value, naming the setting (FR-057)", () => {
    for (const [name] of SETTINGS) {
      for (const bad of ["0", "-1", "abc", "1.5"]) {
        expect(() => loadConfig(baseEnv({ [name]: bad })), `${name}=${bad}`).toThrow(ConfigError);
      }
      try {
        loadConfig(baseEnv({ [name]: "0" }));
      } catch (err) {
        expect((err as Error).message).toContain(name);
      }
    }
  });

  it("keeps the admin refresh interval configurable on its own", () => {
    const config = loadConfig(baseEnv({ ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL: "9000" }));
    expect(config.pollAdminPageRefreshIntervalMs).toBe(9000);
  });

  it("fails to start when a no-default setting is missing, naming it (FR-057)", () => {
    try {
      loadConfig({ ENV_BETTER_AUTH_SECRET: undefined });
      throw new Error("expected loadConfig to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      expect((err as Error).message).toContain("ENV_BETTER_AUTH_SECRET");
    }
  });
});

/**
 * 012: the email rate limit is configurable. It was hard-coded at 2 requests per 15
 * minutes, which made manual testing painful — two login links and you were locked
 * out for a quarter of an hour.
 *
 * Note the unit change: the operator sets the window in MINUTES, not the seconds the
 * limiter itself takes.
 */
describe("Email rate limit configuration (012)", () => {
  it("defaults to 2 requests per 15 minutes", () => {
    const config = loadConfig(baseEnv());
    expect(config.emailRateLimitWindowMinutes).toBe(15);
    expect(config.emailRateLimitMaxRequestsPerWindow).toBe(2);
  });

  it("takes both values from the environment", () => {
    const config = loadConfig({
      ...baseEnv(),
      ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES: "1",
      ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW: "50"
    });
    expect(config.emailRateLimitWindowMinutes).toBe(1);
    expect(config.emailRateLimitMaxRequestsPerWindow).toBe(50);
  });

  it("converts the window to seconds for the limiter, and only there", () => {
    const config = loadConfig({ ...baseEnv(), ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES: "3" });
    // The config holds minutes; emailRateLimit() is the single place that converts.
    expect(config.emailRateLimitWindowMinutes).toBe(3);
    expect(emailRateLimit(config)).toEqual({ window: 180, max: 2 });
  });

  it("rejects a non-positive or non-integer value, like every other numeric setting", () => {
    for (const bad of ["0", "-1", "2.5", "abc"]) {
      expect(() =>
        loadConfig({ ...baseEnv(), ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES: bad })
      , bad).toThrow(ConfigError);
      expect(() =>
        loadConfig({ ...baseEnv(), ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW: bad })
      , bad).toThrow(ConfigError);
    }
  });
});

/**
 * 012 FR-066: the private-poll voter ceiling is configurable. It is one number
 * serving as both the limit a blank field means and the largest value enterable —
 * the requirements make them the same — so a test deployment can fill a poll in a
 * handful of votes instead of five hundred.
 */
describe("Private voter limit configuration (012)", () => {
  it("defaults to 100", () => {
    expect(loadConfig(baseEnv()).maxPrivatePollVoters).toBe(100);
  });

  it("takes its value from the environment", () => {
    const config = loadConfig({ ...baseEnv(), ENV_MAX_PRIVATE_POLL_VOTERS: "10" });
    expect(config.maxPrivatePollVoters).toBe(10);
  });

  it("rejects a non-positive or non-integer value", () => {
    for (const bad of ["0", "-1", "2.5", "abc"]) {
      expect(() =>
        loadConfig({ ...baseEnv(), ENV_MAX_PRIVATE_POLL_VOTERS: bad })
      , bad).toThrow(ConfigError);
    }
  });
});

/**
 * 014: the choice-count bounds were constants in the service; they are settings now so
 * the choices editor's ceiling can be reached in a test deployment. The pair has to make
 * sense together — a ceiling below the floor would make every poll unpublishable.
 */
describe("ENV_STAY_SIGNED_IN", () => {
  it("leaves the stay-signed-in box clear when it is not set", () => {
    expect(loadConfig(baseEnv()).staySignedInDefault).toBe(false);
  });

  it("ticks it only for the value 1", () => {
    expect(loadConfig(baseEnv({ ENV_STAY_SIGNED_IN: "1" })).staySignedInDefault).toBe(true);
    expect(loadConfig(baseEnv({ ENV_STAY_SIGNED_IN: " 1 " })).staySignedInDefault).toBe(true);
  });

  it.each(["0", "", "true", "yes", "2", "11"])("leaves it clear for %j", (value) => {
    expect(loadConfig(baseEnv({ ENV_STAY_SIGNED_IN: value })).staySignedInDefault).toBe(false);
  });
});

describe("Choice count configuration (014)", () => {
  it("takes both bounds from the environment", () => {
    const config = loadConfig({ ...baseEnv(), ENV_MIN_CHOICES: "3", ENV_MAX_CHOICES: "5" });
    expect(config.minChoices).toBe(3);
    expect(config.maxChoices).toBe(5);
  });

  it("rejects a ceiling below the floor", () => {
    expect(() => loadConfig({ ...baseEnv(), ENV_MIN_CHOICES: "5", ENV_MAX_CHOICES: "4" })).toThrow(ConfigError);
  });
});

describe("017 storage, cache and load settings", () => {
  const SETTINGS: [string, keyof ReturnType<typeof loadConfig>, number][] = [
    ["ENV_SESSION_CACHE_TTL", "sessionCacheTtlMs", 300_000],
    ["ENV_MAX_POLLS_SEARCH_RESULTS", "maxPollsSearchResults", 200],
    ["ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS", "maxPollsAdminSearchResults", 200],
    ["ENV_MAX_TRENDING_POLLS", "maxTrendingPolls", 200],
    ["ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL", "trendingPollsRecomputeSweepIntervalMs", 60_000],
    ["ENV_MAX_NEWEST_POLLS", "maxNewestPolls", 50],
    ["ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL", "newestPollsRecomputeSweepIntervalMs", 60_000],
    ["ENV_MAX_VOTES_PER_IP_PER_MINUTE", "maxVotesPerIpPerMinute", 600],
    ["ENV_MAX_LIVE_RESULTS_PER_USER", "maxLiveResultsPerUser", 5],
    ["ENV_LIVE_RESULTS_MAX_IDLE_TIME", "liveResultsMaxIdleTimeMs", 1_800_000],
    ["ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND", "serverMaxRequestsPerInstancePerSecond", 1_250],
    ["ENV_SERVER_MAX_REQUESTS_PER_SECOND", "serverMaxRequestsPerSecond", 15_000],
    ["ENV_SERVER_MAX_SEARCH_PER_SECOND", "serverMaxSearchPerSecond", 2_000],
    ["ENV_SERVER_MAX_SEARCH_FALLBACK_PER_SECOND", "serverMaxSearchFallbackPerSecond", 200],
    ["ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL", "budgetControllerSweepIntervalMs", 1_000],
    ["ENV_MAX_REFRESH_AND_SEARCH_STRETCH", "maxRefreshAndSearchStretch", 8],
    ["ENV_BUDGET_LOWER_THRESHOLD_PERCENT", "budgetLowerThresholdPercent", 80],
    ["ENV_INSTANCE_MAX_INFLIGHT", "instanceMaxInflight", 200],
    ["ENV_INSTANCE_MAX_EVENT_LOOP_LAG", "instanceMaxEventLoopLagMs", 100],
    ["ENV_SHED_RETRY_AFTER", "shedRetryAfterMs", 2_000],
    ["ENV_COUNTER_FLUSH_SWEEP_INTERVAL", "counterFlushSweepIntervalMs", 10_000],
    ["ENV_VOTE_BATCH_SIZE", "voteBatchSize", 500],
    ["ENV_VOTE_QUEUE_LAG_NOTICE", "voteQueueLagNoticeMs", 2_000],
    ["ENV_SEARCH_CACHE_TTL", "searchCacheTtlMs", 10_000],
    ["ENV_OUTBOX_DRAIN_SWEEP_INTERVAL", "outboxDrainSweepIntervalMs", 15_000],
    ["ENV_INVITATION_SWEEP_INTERVAL", "invitationSweepIntervalMs", 30_000],
    ["ENV_MAX_BOOKMARKS_PER_USER", "maxBookmarksPerUser", 200],
    ["ENV_BOOKMARK_EXPIRY_MONTHS", "bookmarkExpiryMonths", 6],
    ["ENV_PAGE_LOADS_PER_MINUTE", "pageLoadsPerMinute", 120]
  ];

  it("applies the documented default for each", () => {
    const config = loadConfig(baseEnv());
    for (const [name, key, expected] of SETTINGS) {
      expect(config[key], name).toBe(expected);
    }
  });

  it("reads each from the environment when set", () => {
    for (const [name, key] of SETTINGS) {
      const env = baseEnv({ [name]: "7" });
      if (name === "ENV_SERVER_MAX_REQUESTS_PER_SECOND") env.ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND = "7";
      if (name === "ENV_MAX_POLLS_SEARCH_RESULTS") env.ENV_MAX_NEWEST_POLLS = "7";
      if (name === "ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL") env[name] = "7000";
      expect(loadConfig(env)[key], name).toBe(name === "ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL" ? 7000 : 7);
    }
  });

  it("no longer ties the manual floor to the counter flush (feature 20261028 R10)", () => {
    const config = loadConfig(baseEnv({ ENV_MIN_MANUAL_REFRESH_INTERVAL: "5000" }));
    expect(config.counterFlushSweepIntervalMs).toBe(10_000);
    expect(config.floors.refresh).toBe(5000);
    expect(loadConfig(baseEnv({ ENV_COUNTER_FLUSH_SWEEP_INTERVAL: "3000" })).counterFlushSweepIntervalMs).toBe(3000);
  });

  it("refuses to start while a renamed setting is still set under its old name, naming the new one", () => {
    const RENAMED: [string, string][] = [
      ["ENV_BUDGET_CONTROLLER_INTERVAL", "ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL"],
      ["ENV_COUNTER_FLUSH_INTERVAL", "ENV_COUNTER_FLUSH_SWEEP_INTERVAL"],
      ["ENV_POLL_APPROVAL_POLLING_INTERVAL", "ENV_POLL_APPROVAL_SWEEP_INTERVAL"],
      ["ENV_OUTBOX_DRAIN_INTERVAL", "ENV_OUTBOX_DRAIN_SWEEP_INTERVAL"],
      ["ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL", "ENV_POLL_EDIT_HEARTBEAT_INTERVAL"],
      ["ENV_POLL_DATE_CHECK_POLLING_INTERVAL", "ENV_POLL_DATE_CHECK_SWEEP_INTERVAL"],
      ["ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL", "ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL"],
      ["ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL", "ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL"],
      ["ENV_MIN_SEARCH_INTERVAL", "ENV_MIN_SEARCH_REFRESH_INTERVAL"],
      ["ENV_MIN_VOTE_INTERVAL", "ENV_MIN_VOTE_REFRESH_INTERVAL"],
      ["ENV_MAX_STRETCH", "ENV_MAX_REFRESH_AND_SEARCH_STRETCH"],
      ["ENV_POLL_EDIT_UPDATE_SWEEP_INTERVAL", "ENV_POLL_EDIT_HEARTBEAT_INTERVAL"],
      ["ENV_MAX_IDLE_TIME", "ENV_LIVE_RESULTS_MAX_IDLE_TIME"],
      ["ENV_API_CALL_TIMEOUT", "ENV_SCREENING_CALL_TIMEOUT"],
      ["ENV_SIGNIN_COOKIE_DURATION_MAX", "ENV_MAX_SIGNIN_COOKIE_DURATION"],
      ["ENV_PRIVATE_VOTER_LIMIT_DEFAULT", "ENV_MAX_PRIVATE_POLL_VOTERS"],
      ["ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW", "ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES"],
      ["ENV_SERVER_MAX_REFRESH_PER_SECOND", "ENV_SERVER_MAX_REQUESTS_PER_SECOND"],
      ["ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND", "ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND"],
      ["ENV_SERVER_MAX_SEARCH_PER_SECOND_FALLBACK", "ENV_SERVER_MAX_SEARCH_FALLBACK_PER_SECOND"]
    ];
    for (const [old, current] of RENAMED) {
      expect(() => loadConfig(baseEnv({ [old]: "5000" })), old).toThrow(new ConfigError(`${old} was renamed to ${current}.`));
    }
  });

  it("bounds the Newest settings: at least one poll, at most the search cap, an interval of at least a second", () => {
    expect(() => loadConfig(baseEnv({ ENV_MAX_NEWEST_POLLS: "0" }))).toThrow(/ENV_MAX_NEWEST_POLLS/);
    expect(() => loadConfig(baseEnv({ ENV_MAX_NEWEST_POLLS: "201" }))).toThrow(/must not exceed ENV_MAX_POLLS_SEARCH_RESULTS/);
    expect(() => loadConfig(baseEnv({ ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL: "500" }))).toThrow(/at least 1000/);
    expect(loadConfig(baseEnv({ ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL: "1000" })).newestPollsRecomputeSweepIntervalMs).toBe(1000);
    expect(loadConfig(baseEnv({ ENV_MAX_NEWEST_POLLS: "200" })).maxNewestPolls).toBe(200);
  });

  it("rejects a non-positive or non-integer value, naming the setting", () => {
    for (const [name] of SETTINGS) {
      for (const bad of ["0", "-1", "abc", "1.5"]) {
        expect(() => loadConfig(baseEnv({ [name]: bad })), `${name}=${bad}`).toThrow(ConfigError);
      }
    }
  });

  it("applies the four per-kind floors with their defaults", () => {
    const { floors } = loadConfig(baseEnv());
    expect(floors).toEqual({ live: 2_000, refresh: 5_000, search: 2_000, vote: 2_000 });
    const custom = loadConfig(
      baseEnv({
        ENV_MIN_LIVE_REFRESH_INTERVAL: "1500",
        ENV_MIN_MANUAL_REFRESH_INTERVAL: "6000",
        ENV_MIN_SEARCH_REFRESH_INTERVAL: "2500",
        ENV_MIN_VOTE_REFRESH_INTERVAL: "3000"
      })
    );
    expect(custom.floors).toEqual({ live: 1_500, refresh: 6_000, search: 2_500, vote: 3_000 });
  });

  it("applies the burst allowances with their defaults, fixed at one for Live Results and votes (FIX008)", () => {
    expect(loadConfig(baseEnv()).bursts).toEqual({ live: 1, refresh: 5, search: 3, vote: 1 });
    expect(loadConfig(baseEnv({ ENV_MANUAL_REFRESH_BURST: "8", ENV_SEARCH_BURST: "1" })).bursts).toEqual({
      live: 1,
      refresh: 8,
      search: 1,
      vote: 1
    });
    expect(() => loadConfig(baseEnv({ ENV_MANUAL_REFRESH_BURST: "0" }))).toThrow(/ENV_MANUAL_REFRESH_BURST/);
  });

  it("defaults the database URL and refuses a non-PostgreSQL string", () => {
    expect(loadConfig(baseEnv()).databaseUrl).toBe("postgres://localhost:5432/app01");
    expect(
      loadConfig(baseEnv({ ENV_DATABASE_URL: "postgresql://u:p@db.example.com:25060/app?sslmode=require" }))
        .databaseUrl
    ).toContain("db.example.com");
    expect(() => loadConfig(baseEnv({ ENV_DATABASE_URL: "mongodb://localhost:27017/app01" }))).toThrow(
      /ENV_DATABASE_URL/
    );
  });

  it("refuses a remote ENV_VALKEY_URL beside a local ENV_DATABASE_URL, naming both hosts and no credentials", () => {
    const remote = "rediss://default:valkey-pw@valkey.example.com:25061";
    for (const database of ["postgres://postgres:pg-pw@localhost:5432/app01", "postgres://u:p@127.0.0.1:5432/app01"]) {
      let error: unknown;
      try {
        loadConfig(baseEnv({ ENV_DATABASE_URL: database, ENV_VALKEY_URL: remote }));
      } catch (err) {
        error = err;
      }
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as Error).message).toMatch(/ENV_VALKEY_URL names valkey.example.com while ENV_DATABASE_URL names (localhost|127.0.0.1)/);
      expect((error as Error).message).not.toMatch(/pw/);
    }
    expect(loadConfig(baseEnv({ ENV_VALKEY_URL: "redis://localhost:6379" })).valkeyUrl).toBe("redis://localhost:6379");
    expect(loadConfig(baseEnv({ ENV_VALKEY_URL: "" })).valkeyUrl).toBeUndefined();
    expect(
      loadConfig(baseEnv({ ENV_DATABASE_URL: "postgresql://app:pw@db.example.com:25060/crowdpoll", ENV_VALKEY_URL: remote })).valkeyUrl
    ).toBe(remote);
  });

  it("does not check the default database URL, so the build loads beside a remote ENV_VALKEY_URL", () => {
    const remote = "rediss://default:valkey-pw@valkey.example.com:25061";
    const config = loadConfig(baseEnv({ ENV_VALKEY_URL: remote }));
    expect(config.databaseUrl).toBe("postgres://localhost:5432/app01");
    expect(config.valkeyUrl).toBe(remote);
  });

  it("leaves the cache, search engine and Spaces unset by default", () => {
    const config = loadConfig(baseEnv());
    expect(config.valkeyUrl).toBeUndefined();
    expect(config.openSearchUrl).toBeUndefined();
    expect(config.spaces).toBeUndefined();
    const configured = loadConfig(
      baseEnv({
        ENV_DATABASE_URL: "postgresql://app:pw@db.example.com:25060/crowdpoll",
        ENV_VALKEY_URL: "rediss://valkey.example.com:25061",
        ENV_OPENSEARCH_URL: "https://search.example.com:25060",
        ENV_SPACES_BUCKET: "crowdpoll",
        ENV_SPACES_REGION: "nyc3",
        ENV_SPACES_KEY: "key",
        ENV_SPACES_SECRET: "secret",
        ENV_SPACES_CDN_URL: "https://crowdpoll.nyc3.cdn.digitaloceanspaces.com"
      })
    );
    expect(configured.valkeyUrl).toBe("rediss://valkey.example.com:25061");
    expect(configured.openSearchUrl).toBe("https://search.example.com:25060");
    expect(configured.spaces).toEqual({
      bucket: "crowdpoll",
      region: "nyc3",
      key: "key",
      secret: "secret",
      cdnUrl: "https://crowdpoll.nyc3.cdn.digitaloceanspaces.com"
    });
  });

  it("refuses a partial Spaces configuration, naming the missing variables", () => {
    expect(() => loadConfig(baseEnv({ ENV_SPACES_BUCKET: "crowdpoll" }))).toThrow(/ENV_SPACES_REGION/);
  });

  it("no longer reads the MongoDB or card-polling variables", () => {
    const config = loadConfig(
      baseEnv({
        ENV_MONGODB_URI: "mongodb://localhost:27017/app01",
        ENV_MONGODB_NAME: "app01",
        ENV_POLLING_INTERVAL: "5000"
      })
    ) as Record<string, unknown>;
    expect(config.mongodbUri).toBeUndefined();
    expect(config.mongodbName).toBeUndefined();
    expect(config.pollingIntervalMs).toBeUndefined();
  });

  it("refuses a controller interval longer than the smallest floor", () => {
    expect(() =>
      loadConfig(baseEnv({ ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL: "2001", ENV_MIN_LIVE_REFRESH_INTERVAL: "2000" }))
    ).toThrow(/ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL/);
    expect(loadConfig(baseEnv({ ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL: "2000" })).budgetControllerSweepIntervalMs).toBe(
      2000
    );
  });

  it("refuses a budget cap below the per-instance budget", () => {
    expect(() =>
      loadConfig(
        baseEnv({
          ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND: "2000",
          ENV_SERVER_MAX_REQUESTS_PER_SECOND: "1999"
        })
      )
    ).toThrow(/ENV_SERVER_MAX_REQUESTS_PER_SECOND/);
  });
});

describe("ENV_MAX_INVITATIONS_PER_DAY", () => {
  it("defaults to 200", () => {
    expect(loadConfig(baseEnv()).maxInvitationsPerDay).toBe(200);
  });

  it("reads a positive integer", () => {
    expect(loadConfig(baseEnv({ ENV_MAX_INVITATIONS_PER_DAY: "5" })).maxInvitationsPerDay).toBe(5);
  });

  it.each(["0", "-1", "abc"])("refuses to start on %j, naming the variable", (value) => {
    expect(() => loadConfig(baseEnv({ ENV_MAX_INVITATIONS_PER_DAY: value }))).toThrow(/ENV_MAX_INVITATIONS_PER_DAY/);
  });
});

describe("line-graph settings", () => {
  it("defaults the threshold to 1 and the interval to 60000", () => {
    const config = loadConfig(baseEnv());
    expect(config.lineGraphMinVotePercentage).toBe(1);
    expect(config.lineGraphRefreshIntervalMs).toBe(60_000);
  });

  it("accepts 0 as the threshold — the filter is disabled, not invalid", () => {
    expect(loadConfig(baseEnv({ ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE: "0" })).lineGraphMinVotePercentage).toBe(0);
  });

  it.each(["-1", "abc", "1.5"])("refuses a threshold of %j, naming the variable", (value) => {
    expect(() => loadConfig(baseEnv({ ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE: value }))).toThrow(
      /ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE/
    );
  });

  it("clamps the interval up to the live-refresh floor instead of undercutting it", () => {
    const clamped = loadConfig(baseEnv({ ENV_LINE_GRAPH_REFRESH_INTERVAL: "500", ENV_MIN_LIVE_REFRESH_INTERVAL: "2000" }));
    expect(clamped.lineGraphRefreshIntervalMs).toBe(2000);
    const above = loadConfig(baseEnv({ ENV_LINE_GRAPH_REFRESH_INTERVAL: "5000", ENV_MIN_LIVE_REFRESH_INTERVAL: "2000" }));
    expect(above.lineGraphRefreshIntervalMs).toBe(5000);
  });

  it.each(["0", "-1", "abc"])("refuses an interval of %j, naming the variable", (value) => {
    expect(() => loadConfig(baseEnv({ ENV_LINE_GRAPH_REFRESH_INTERVAL: value }))).toThrow(
      /ENV_LINE_GRAPH_REFRESH_INTERVAL/
    );
  });
});

const NUMERIC_DEFAULTS: [string, string][] = [
  ["ENV_BOOKMARK_EXPIRY_MONTHS", "6"],
  ["ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL", "1000"],
  ["ENV_BUDGET_LOWER_THRESHOLD_PERCENT", "80"],
  ["ENV_COUNTER_FLUSH_SWEEP_INTERVAL", "10000"],
  ["ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW", "2"],
  ["ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES", "15"],
  ["ENV_EMAIL_SEND_TIMEOUT", "10000"],
  ["ENV_INSTANCE_MAX_EVENT_LOOP_LAG", "100"],
  ["ENV_INSTANCE_MAX_INFLIGHT", "200"],
  ["ENV_INVITATION_SWEEP_INTERVAL", "30000"],
  ["ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE", "1"],
  ["ENV_LINE_GRAPH_REFRESH_INTERVAL", "60000"],
  ["ENV_LIVE_RESULTS_MAX_IDLE_TIME", "1800000"],
  ["ENV_MANUAL_REFRESH_BURST", "5"],
  ["ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS", "10"],
  ["ENV_MAX_BOOKMARKS_PER_USER", "200"],
  ["ENV_MAX_CHOICES", "50"],
  ["ENV_MAX_INVITATIONS_PER_DAY", "200"],
  ["ENV_MAX_LIVE_RESULTS_PER_USER", "5"],
  ["ENV_MAX_NEWEST_POLLS", "50"],
  ["ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS", "200"],
  ["ENV_MAX_POLLS_SEARCH_RESULTS", "200"],
  ["ENV_MAX_PRIVATE_POLL_VOTERS", "100"],
  ["ENV_MAX_REFRESH_AND_SEARCH_STRETCH", "8"],
  ["ENV_MAX_SIGNIN_COOKIE_DURATION", "2592000000"],
  ["ENV_MAX_TRENDING_POLLS", "200"],
  ["ENV_MAX_VOTES_PER_IP_PER_MINUTE", "600"],
  ["ENV_MIN_CHOICES", "2"],
  ["ENV_MIN_LIVE_REFRESH_INTERVAL", "2000"],
  ["ENV_MIN_MANUAL_REFRESH_INTERVAL", "5000"],
  ["ENV_MIN_SEARCH_REFRESH_INTERVAL", "2000"],
  ["ENV_MIN_VOTE_REFRESH_INTERVAL", "2000"],
  ["ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL", "60000"],
  ["ENV_OUTBOX_DRAIN_SWEEP_INTERVAL", "15000"],
  ["ENV_PAGE_LOADS_PER_MINUTE", "120"],
  ["ENV_PARTICIPANTS_VIEWPORT_SIZE", "10"],
  ["ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL", "5000"],
  ["ENV_POLL_APPROVAL_SWEEP_INTERVAL", "5000"],
  ["ENV_POLL_DATE_CHECK_SWEEP_INTERVAL", "60000"],
  ["ENV_POLL_EDIT_HEARTBEAT_INTERVAL", "10000"],
  ["ENV_PORT", "8080"],
  ["ENV_SCREENING_CALL_TIMEOUT", "10000"],
  ["ENV_SEARCH_BURST", "3"],
  ["ENV_SEARCH_CACHE_TTL", "10000"],
  ["ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND", "1250"],
  ["ENV_SERVER_MAX_REQUESTS_PER_SECOND", "15000"],
  ["ENV_SERVER_MAX_SEARCH_FALLBACK_PER_SECOND", "200"],
  ["ENV_SERVER_MAX_SEARCH_PER_SECOND", "2000"],
  ["ENV_SESSION_CACHE_TTL", "300000"],
  ["ENV_SHED_RETRY_AFTER", "2000"],
  ["ENV_SMTP_PORT", "2525"],
  ["ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL", "60000"],
  ["ENV_VOTE_BATCH_SIZE", "500"],
  ["ENV_VOTE_QUEUE_LAG_NOTICE", "2000"],
];

function defaultOf(config: { defaultsUsed: readonly { name: string; value: string }[] }, name: string) {
  return config.defaultsUsed.find((entry) => entry.name === name)?.value;
}

describe("defaultsUsed", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists the text settings left at their defaults, with their values", () => {
    const config = loadConfig(baseEnv());
    expect(defaultOf(config, "ENV_SIGNIN_METHOD")).toBe("native");
    expect(defaultOf(config, "ENV_DATABASE_URL")).toBe("postgres://localhost:5432/app01");
    expect(defaultOf(config, "ENV_EMAIL_TRANSPORT")).toBe("smtp");
    expect(defaultOf(config, "ENV_ADMINS")).toBe("roadraceresults@gmail.com");
    expect(defaultOf(config, "ENV_EMAIL_FROM")).toBe("CrowdPoll <no-reply@mail.crowdpoll.vote>");
  });

  it("lists every numeric setting exactly once with its default", () => {
    const names = loadConfig(baseEnv()).defaultsUsed.map((entry) => entry.name);
    const config = loadConfig(baseEnv());
    for (const [name, value] of NUMERIC_DEFAULTS) {
      expect(names.filter((listed) => listed === name), name).toHaveLength(1);
      expect(defaultOf(config, name), name).toBe(value);
    }
  });

  it("does not list a setting given a value", () => {
    expect(defaultOf(loadConfig(baseEnv({ ENV_PORT: "9090" })), "ENV_PORT")).toBeUndefined();
  });

  it("lists an empty number setting, which takes its default", () => {
    expect(defaultOf(loadConfig(baseEnv({ ENV_PORT: "" })), "ENV_PORT")).toBe("8080");
  });

  it("does not list an empty text setting, which keeps its empty value", () => {
    const config = loadConfig(baseEnv({ ENV_ADMINS: "" }));
    expect(defaultOf(config, "ENV_ADMINS")).toBeUndefined();
    expect(config.admins).toEqual([]);
  });

  it("is sorted by name with no setting listed twice", () => {
    const names = loadConfig(baseEnv()).defaultsUsed.map((entry) => entry.name);
    expect(names).toEqual([...names].sort());
    expect(new Set(names).size).toBe(names.length);
  });

  it("never lists a required setting", () => {
    const names = loadConfig(baseEnv()).defaultsUsed.map((entry) => entry.name);
    expect(names).not.toContain("ENV_BETTER_AUTH_SECRET");
    expect(names).not.toContain("ENV_PUBLIC_ORIGIN");
  });

  it("lists each setting with no value, naming what the server does instead", () => {
    const config = loadConfig(baseEnv());
    expect(defaultOf(config, "ENV_VALKEY_URL")).toBe("none (in-process cache, queue and registry)");
    expect(defaultOf(config, "ENV_OPENSEARCH_URL")).toBe("none (PostgreSQL full-text search)");
    expect(defaultOf(config, "ENV_SPACES_*")).toBe("none (TRENDING objects and assets served from the instance)");
    expect(defaultOf(config, "ENV_DATABASE_CA_CERT")).toBe("none (system certificate roots)");
    expect(defaultOf(config, "ENV_ALLOWED_EMAILS")).toBe("none (allowlist off: everyone may sign in)");
    expect(defaultOf(config, "ENV_EMAIL_ASSET_ORIGIN")).toBe("none (each link's own origin)");
    expect(defaultOf(config, "ENV_PROTOTYPES")).toBe("none (no prototypes served)");
    expect(defaultOf(config, "ENV_STAY_SIGNED_IN")).toBe("0 (the Stay signed in box starts clear)");
    expect(defaultOf(config, "ENV_SMTP_USER")).toBe("none (emails logged to the console, not sent)");
    expect(defaultOf(config, "ENV_SMTP_PASS")).toBe("none (emails logged to the console, not sent)");
    expect(config.defaultsUsed.some((entry) => entry.name === "ENV_SPACES_BUCKET")).toBe(false);
  });

  it("lists an empty optional setting and drops one given a value", () => {
    expect(defaultOf(loadConfig(baseEnv({ ENV_VALKEY_URL: "" })), "ENV_VALKEY_URL")).toBeDefined();
    expect(defaultOf(loadConfig(baseEnv({ ENV_VALKEY_URL: "redis://localhost:6379" })), "ENV_VALKEY_URL")).toBeUndefined();
    expect(defaultOf(loadConfig(baseEnv({ ENV_SMTP_USER: "" })), "ENV_SMTP_USER")).toBeDefined();
    expect(defaultOf(loadConfig(baseEnv({ ENV_PROTOTYPES: " , " })), "ENV_PROTOTYPES")).toBeDefined();
    expect(defaultOf(loadConfig(baseEnv({ ENV_PROTOTYPES: "SINGLE-COLUMN-RENDERING" })), "ENV_PROTOTYPES")).toBeUndefined();
  });

  it("drops the Spaces line once all five Spaces settings are given", () => {
    const spaces = {
      ENV_SPACES_BUCKET: "b",
      ENV_SPACES_REGION: "r",
      ENV_SPACES_KEY: "k",
      ENV_SPACES_SECRET: "s",
      ENV_SPACES_CDN_URL: "https://cdn.example"
    };
    expect(defaultOf(loadConfig(baseEnv(spaces)), "ENV_SPACES_*")).toBeUndefined();
  });

  it("lists each sign-in provider left out, as one line per provider", () => {
    const config = loadConfig(
      baseEnv({ ENV_SIGNIN_METHOD: "both", ENV_OAUTH_GOOGLE_CLIENT_ID: "id", ENV_OAUTH_GOOGLE_CLIENT_SECRET: "secret" })
    );
    expect(defaultOf(config, "ENV_OAUTH_APPLE_*")).toBe("none (Apple sign-in off)");
    expect(defaultOf(config, "ENV_OAUTH_MICROSOFT_*")).toBe("none (Microsoft sign-in off)");
    expect(defaultOf(config, "ENV_OAUTH_AMAZON_*")).toBe("none (Amazon sign-in off)");
    expect(defaultOf(config, "ENV_OAUTH_GOOGLE_*")).toBeUndefined();
  });

  it("lists the SMTP settings only while email goes through SMTP", () => {
    const ses = loadConfig(
      baseEnv({
        ENV_EMAIL_TRANSPORT: "ses",
        ENV_SES_REGION: "us-east-1",
        ENV_SES_ACCESS_KEY_ID: "key",
        ENV_SES_SECRET_ACCESS_KEY: "secret"
      })
    );
    expect(ses.defaultsUsed.filter((entry) => entry.name.startsWith("ENV_SMTP_"))).toEqual([]);
    const smtp = loadConfig(baseEnv());
    expect(defaultOf(smtp, "ENV_SMTP_HOST")).toBe("sandbox.smtp.mailtrap.io");
    expect(defaultOf(smtp, "ENV_SMTP_PORT")).toBe("2525");
  });

  it("lists no sign-in provider in native mode", () => {
    expect(loadConfig(baseEnv()).defaultsUsed.filter((entry) => entry.name.startsWith("ENV_OAUTH_"))).toEqual([]);
  });

  it("prints nothing while loading, valid or not", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    loadConfig(baseEnv());
    expect(() => loadConfig(baseEnv({ ENV_PORT: "abc" }))).toThrow(ConfigError);
    expect(log).not.toHaveBeenCalled();
  });
});

describe("defaultsUsedLines", () => {
  it("writes one line per default in the start-up wording", () => {
    const config = { ...loadConfig(baseEnv()), defaultsUsed: [{ name: "ENV_PORT", value: "8080" }] };
    expect(defaultsUsedLines(config)).toEqual(["[config] ENV_PORT was not found, using default value: 8080."]);
  });

  it("masks the default administrator address", () => {
    const config = { ...loadConfig(baseEnv()), defaultsUsed: [{ name: "ENV_ADMINS", value: "roadraceresults@gmail.com" }] };
    expect(defaultsUsedLines(config)).toEqual(["[config] ENV_ADMINS was not found, using default value: r•••@gmail.com."]);
  });

  it("prints the service's own sender in full", () => {
    const from = "CrowdPoll <no-reply@mail.crowdpoll.vote>";
    const config = { ...loadConfig(baseEnv()), defaultsUsed: [{ name: "ENV_EMAIL_FROM", value: from }] };
    expect(defaultsUsedLines(config)).toEqual([`[config] ENV_EMAIL_FROM was not found, using default value: ${from}.`]);
  });

  it("never prints the full default administrator address", () => {
    for (const line of defaultsUsedLines(loadConfig(baseEnv()))) {
      expect(line).not.toContain("roadraceresults@gmail.com");
    }
  });

  it("writes nothing when every setting was given", () => {
    expect(defaultsUsedLines({ ...loadConfig(baseEnv()), defaultsUsed: [] })).toEqual([]);
  });
});
