/**
 * ENV_* environment configuration (FR-021).
 * Parses and validates all runtime settings, failing fast with a friendly
 * error naming the offending variable (FR-022).
 */
import { EMAIL_PATTERN, emailKeyOf } from "./auth/emailKey.js";

export type SigninMethod = "native" | "oauth" | "both";

export interface OAuthClient {
  clientId: string;
  clientSecret: string;
}

export interface AppleSignin {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
}

/** The enabled sign-in providers, keyed in display order (research R4). */
export interface OAuthProviders {
  google?: OAuthClient;
  apple?: AppleSignin;
  microsoft?: OAuthClient;
  amazon?: OAuthClient;
}

export interface AppConfig {
  port: number;
  databaseUrl: string;
  /** PEM of the CA that signed the database server's certificate; see createDb. */
  databaseCaCert?: string;
  valkeyUrl?: string;
  openSearchUrl?: string;
  spaces?: SpacesConfig;
  admins: string[];
  /** Folders under prototypes/ the server serves at /prototypes/<name>/ (ENV_PROTOTYPES); none by default. */
  prototypes: string[];
  signinCookieDurationMaxMs: number;
  /** Whether the login page's "Stay signed in" box starts ticked (ENV_STAY_SIGNED_IN=1; any other value, or none, leaves it clear). */
  staySignedInDefault: boolean;
  signinMethod: SigninMethod;
  /** The email-link routes are served (native or both). */
  nativeSignin: boolean;
  /** The provider routes are served (oauth or both). */
  oauthSignin: boolean;
  oauthProviders: OAuthProviders;
  /** The one origin the site is reached at (ENV_PUBLIC_ORIGIN); every provider redirect URI is built from it. */
  publicOrigin: string;
  /** Secret for session-cookie signing / token hashing (BetterAuth). Required, ≥32 chars. */
  authSecret: string;
  /** 011: bound on one Acceptability Screening call. */
  apiCallTimeoutMs: number;
  /** 011: how often polls awaiting approval are swept. */
  pollApprovalPollingIntervalMs: number;
  /** 011: how often poll schedules are re-evaluated. */
  pollDateCheckPollingIntervalMs: number;
  /** 011: how often an open editing page signals it is still present. */
  pollEditUpdateHeartbeatIntervalMs: number;
  /** 011: screening attempts before a poll is rejected and left to an admin. */
  maxAcceptabilityScreeningAttempts: number;
  /** 011: how often the admin poll list refreshes. */
  pollAdminPageRefreshIntervalMs: number;
  participantsViewportSize: number;
  /**
   * 012: the shared window for every email-sending endpoint, in MINUTES — the unit
   * the operator sets it in, rather than the seconds BetterAuth wants. Kept
   * configurable because the default makes manual testing painful: two login links
   * and you are locked out for a quarter of an hour.
   */
  emailRateLimitWindowMinutes: number;
  /** 012: how many requests that window allows per client. */
  emailRateLimitMaxRequests: number;
  /**
   * 012: the voter ceiling on a private poll — serving as both the limit a blank
   * field means and the largest value an administrator may enter, because the
   * requirements make them the same number. Configurable so a test poll can be
   * filled in a handful of votes rather than five hundred.
   */
  privateVoterLimitDefault: number;
  /**
   * 014: the number of choices a poll must have to be published, inclusive at both
   * ends. Were 2 and 50 hard-coded in the service; configurable so the ceiling can
   * be lowered to exercise the choices editor's limit without typing fifty lines.
   */
  minChoices: number;
  maxChoices: number;
  smtp: {
    host: string;
    port: number;
    user?: string;
    pass?: string;
  };
  emailTransport: EmailTransport;
  ses?: SesConfig;
  emailFrom: string;
  /** Origin the email logo is loaded from (ENV_EMAIL_ASSET_ORIGIN); unset → each link's own origin. */
  emailAssetOrigin?: string;
  /** Email keys allowed to sign up and sign in before launch (ENV_ALLOWED_EMAILS); unset → everyone. */
  allowedEmailKeys?: Set<string>;
  emailSendTimeoutMs: number;
  sessionCacheTtlMs: number;
  maxPollsSearchResults: number;
  maxPollsAdminSearchResults: number;
  maxTrendingPolls: number;
  trendingRecomputeIntervalMs: number;
  maxNewestPolls: number;
  newestRecomputeIntervalMs: number;
  floors: RefreshFloors;
  bursts: RefreshBursts;
  /** Whole-percent share a choice must exceed to be drawn on the line graph; 0 disables the filter. */
  lineGraphMinVotePercentage: number;
  /** How often the maximized view's line graph refreshes, clamped up to the live-refresh floor. */
  lineGraphRefreshIntervalMs: number;
  maxVotesPerIpPerMinute: number;
  maxLiveResultsPerUser: number;
  maxInvitationsPerDay: number;
  maxIdleTimeMs: number;
  serverMaxRefreshPerInstancePerSecond: number;
  serverMaxRefreshPerSecond: number;
  serverMaxSearchPerSecond: number;
  serverMaxSearchPerSecondFallback: number;
  budgetControllerIntervalMs: number;
  maxStretch: number;
  budgetLowerThresholdPercent: number;
  instanceMaxInflight: number;
  instanceMaxEventLoopLagMs: number;
  shedRetryAfterMs: number;
  counterFlushIntervalMs: number;
  voteBatchSize: number;
  voteQueueLagNoticeMs: number;
  searchCacheTtlMs: number;
  outboxDrainIntervalMs: number;
  maxBookmarksPerUser: number;
  bookmarkExpiryMonths: number;
  pageLoadsPerMinute: number;
}

export type EmailTransport = "smtp" | "ses";

export interface SesConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface SpacesConfig {
  bucket: string;
  region: string;
  key: string;
  secret: string;
  cdnUrl: string;
}

/** Shortest interval, in ms, between two requests of one kind from one user. */
export interface RefreshFloors {
  live: number;
  refresh: number;
  search: number;
  vote: number;
}

/**
 * FIX008: how many requests of one kind a user may make back to back before the
 * floor applies — a token bucket of this size, refilled one token per floor
 * interval. Live Results and votes are always 1 (FR-035 wants votes strictly one
 * per interval; Live Results is timer-driven).
 */
export type RefreshBursts = RefreshFloors;

export class ConfigError extends Error {}

type Env = Record<string, string | undefined>;

function intVar(env: Env, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new ConfigError(
      `Invalid ${name}: "${raw}" — expected a positive integer.`
    );
  }
  return value;
}

function nonNegativeIntVar(env: Env, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new ConfigError(
      `Invalid ${name}: "${raw}" — expected a non-negative integer.`
    );
  }
  return value;
}

export function loadConfig(env: Env = process.env): AppConfig {
  const signinMethod = env.ENV_SIGNIN_METHOD ?? "native";
  if (signinMethod !== "native" && signinMethod !== "oauth" && signinMethod !== "both") {
    throw new ConfigError(
      `Invalid ENV_SIGNIN_METHOD: "${signinMethod}" — expected "native", "oauth" or "both".`
    );
  }
  const nativeSignin = signinMethod !== "oauth";
  const oauthSignin = signinMethod !== "native";
  const oauthProviders = oauthSignin ? oauthProvidersOf(env) : {};
  if (oauthSignin && Object.keys(oauthProviders).length === 0) {
    throw new ConfigError(
      `Invalid ENV_SIGNIN_METHOD: "${signinMethod}" needs at least one sign-in provider, and no sign-in provider is configured.`
    );
  }

  const databaseUrl = env.ENV_DATABASE_URL ?? "postgres://localhost:5432/app01";
  if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
    throw new ConfigError(
      `Invalid ENV_DATABASE_URL: "${databaseUrl}" — expected a postgres:// or postgresql:// connection string.`
    );
  }

  // A pasted single-line value carries its line breaks as the two characters \n.
  const databaseCaCert = optionalVar(env, "ENV_DATABASE_CA_CERT")?.replace(/\\n/g, "\n");
  if (databaseCaCert !== undefined && !databaseCaCert.includes("-----BEGIN CERTIFICATE-----")) {
    throw new ConfigError("Invalid ENV_DATABASE_CA_CERT: expected a PEM certificate (-----BEGIN CERTIFICATE-----).");
  }

  // A local database with a shared Valkey would trade votes and counter flushes with
  // the instances that use that Valkey, each dropping what its own database lacks.
  // The default database URL is not checked: the build (publish-assets) loads the
  // configuration without the run-time-only ENV_DATABASE_URL and never connects.
  const valkeyUrl = optionalVar(env, "ENV_VALKEY_URL");
  const databaseHost = env.ENV_DATABASE_URL === undefined ? undefined : hostOf(databaseUrl);
  const valkeyHost = valkeyUrl === undefined ? undefined : hostOf(valkeyUrl);
  if (databaseHost !== undefined && isLocalHost(databaseHost) && valkeyHost !== undefined && !isLocalHost(valkeyHost)) {
    throw new ConfigError(
      `ENV_VALKEY_URL names ${valkeyHost} while ENV_DATABASE_URL names ${databaseHost}: a local database needs a local Valkey, or none (leave ENV_VALKEY_URL unset).`
    );
  }

  // FR-010 (002-smtp-env-config): mandatory in every environment — no fallback.
  const authSecret = env.ENV_BETTER_AUTH_SECRET;
  if (!authSecret || authSecret.length < 32) {
    throw new ConfigError(
      "Invalid ENV_BETTER_AUTH_SECRET: this required variable must be set to a secret of at least 32 characters. " +
        "Run devScripts.example/setup-dev.ps1 to generate one for local development."
    );
  }

  const publicOrigin = originVar(env, "ENV_PUBLIC_ORIGIN");
  if (publicOrigin === undefined) {
    throw new ConfigError("Invalid ENV_PUBLIC_ORIGIN: this required variable must be set to the site's origin, such as https://crowdpoll.vote.");
  }

  const emailTransport = env.ENV_EMAIL_TRANSPORT ?? "smtp";
  if (emailTransport !== "smtp" && emailTransport !== "ses") {
    throw new ConfigError(`Invalid ENV_EMAIL_TRANSPORT: "${emailTransport}" — expected "smtp" or "ses".`);
  }

  const minChoices = intVar(env, "ENV_MIN_CHOICES", 2);
  const maxChoices = intVar(env, "ENV_MAX_CHOICES", 50);
  if (maxChoices < minChoices) {
    throw new ConfigError(
      `Invalid ENV_MAX_CHOICES: ${maxChoices} — must be at least ENV_MIN_CHOICES (${minChoices}).`
    );
  }

  const floors: RefreshFloors = {
    live: intVar(env, "ENV_MIN_LIVE_REFRESH_INTERVAL", 2_000),
    refresh: intVar(env, "ENV_MIN_MANUAL_REFRESH_INTERVAL", 5_000),
    search: intVar(env, "ENV_MIN_SEARCH_INTERVAL", 2_000),
    vote: intVar(env, "ENV_MIN_VOTE_INTERVAL", 2_000)
  };
  const bursts: RefreshBursts = {
    live: 1,
    refresh: intVar(env, "ENV_MANUAL_REFRESH_BURST", 5),
    search: intVar(env, "ENV_SEARCH_BURST", 3),
    vote: 1
  };
  const budgetControllerIntervalMs = intVar(env, "ENV_BUDGET_CONTROLLER_INTERVAL", 1_000);
  const smallestFloor = Math.min(...Object.values(floors));
  if (budgetControllerIntervalMs > smallestFloor) {
    throw new ConfigError(
      `Invalid ENV_BUDGET_CONTROLLER_INTERVAL: ${budgetControllerIntervalMs} — must not exceed the smallest refresh floor (${smallestFloor}).`
    );
  }

  const maxPollsSearchResults = intVar(env, "ENV_MAX_POLLS_SEARCH_RESULTS", 200);
  const maxNewestPolls = intVar(env, "ENV_MAX_NEWEST_POLLS", 50);
  if (maxNewestPolls > maxPollsSearchResults) {
    throw new ConfigError(
      `Invalid ENV_MAX_NEWEST_POLLS: ${maxNewestPolls} — must not exceed ENV_MAX_POLLS_SEARCH_RESULTS (${maxPollsSearchResults}).`
    );
  }
  const newestRecomputeIntervalMs = intVar(env, "ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL", 60_000);
  if (newestRecomputeIntervalMs < 1000) {
    throw new ConfigError(
      `Invalid ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL: ${newestRecomputeIntervalMs} — must be at least 1000.`
    );
  }

  const serverMaxRefreshPerInstancePerSecond = intVar(
    env,
    "ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND",
    1_250
  );
  const serverMaxRefreshPerSecond = intVar(env, "ENV_SERVER_MAX_REFRESH_PER_SECOND", 15_000);
  if (serverMaxRefreshPerSecond < serverMaxRefreshPerInstancePerSecond) {
    throw new ConfigError(
      `Invalid ENV_SERVER_MAX_REFRESH_PER_SECOND: ${serverMaxRefreshPerSecond} — must be at least ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND (${serverMaxRefreshPerInstancePerSecond}).`
    );
  }

  const admins = (env.ENV_ADMINS ?? "roadraceresults@gmail.com")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter((a) => a.length > 0);

  const prototypes = (env.ENV_PROTOTYPES ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  for (const name of prototypes) {
    if (!/^[A-Za-z0-9_-]+$/.test(name)) {
      throw new ConfigError(`Invalid ENV_PROTOTYPES: "${name}" — folder names may hold only letters, digits, "_" and "-".`);
    }
  }

  return {
    port: intVar(env, "ENV_PORT", 8080),
    databaseUrl,
    databaseCaCert,
    valkeyUrl,
    openSearchUrl: optionalVar(env, "ENV_OPENSEARCH_URL"),
    spaces: spacesConfig(env),
    admins,
    prototypes,
    signinCookieDurationMaxMs: intVar(
      env,
      "ENV_SIGNIN_COOKIE_DURATION_MAX",
      2_592_000_000
    ),
    staySignedInDefault: env.ENV_STAY_SIGNED_IN?.trim() === "1",
    signinMethod,
    nativeSignin,
    oauthSignin,
    oauthProviders,
    publicOrigin,
    authSecret,
    // 011 new settings — see specs/011-SIMPLIFY-POLL-STATES/data-model.md
    apiCallTimeoutMs: intVar(env, "ENV_API_CALL_TIMEOUT", 10_000),
    pollApprovalPollingIntervalMs: intVar(env, "ENV_POLL_APPROVAL_POLLING_INTERVAL", 5_000),
    pollDateCheckPollingIntervalMs: intVar(env, "ENV_POLL_DATE_CHECK_POLLING_INTERVAL", 60_000),
    pollEditUpdateHeartbeatIntervalMs: intVar(env, "ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL", 10_000),
    maxAcceptabilityScreeningAttempts: intVar(env, "ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS", 10),
    pollAdminPageRefreshIntervalMs: intVar(env, "ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL", 5_000),
    participantsViewportSize: intVar(env, "ENV_PARTICIPANTS_VIEWPORT_SIZE", 10),
    // 012: was a hard-coded 15 minutes / 2 requests. The window is expressed in
    // minutes here; auth.ts converts to the seconds the limiter takes.
    emailRateLimitWindowMinutes: intVar(env, "ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW", 15),
    emailRateLimitMaxRequests: intVar(
      env,
      "ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW",
      2
    ),
    privateVoterLimitDefault: intVar(env, "ENV_PRIVATE_VOTER_LIMIT_DEFAULT", 100),
    minChoices,
    maxChoices,
    smtp: {
      host: env.ENV_SMTP_HOST ?? "sandbox.smtp.mailtrap.io",
      port: intVar(env, "ENV_SMTP_PORT", 2525),
      user: env.ENV_SMTP_USER,
      pass: env.ENV_SMTP_PASS
    },
    emailTransport,
    ses: emailTransport === "ses" ? sesConfig(env) : undefined,
    emailFrom: env.ENV_EMAIL_FROM ?? "CrowdPoll <no-reply@mail.crowdpoll.vote>",
    emailAssetOrigin: originVar(env, "ENV_EMAIL_ASSET_ORIGIN"),
    allowedEmailKeys: allowedEmailKeys(env),
    emailSendTimeoutMs: intVar(env, "ENV_EMAIL_SEND_TIMEOUT", 10_000),
    sessionCacheTtlMs: intVar(env, "ENV_SESSION_CACHE_TTL", 300_000),
    maxPollsSearchResults,
    maxPollsAdminSearchResults: intVar(env, "ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS", 200),
    maxTrendingPolls: intVar(env, "ENV_MAX_TRENDING_POLLS", 200),
    trendingRecomputeIntervalMs: intVar(env, "ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL", 60_000),
    maxNewestPolls,
    newestRecomputeIntervalMs,
    floors,
    bursts,
    lineGraphMinVotePercentage: nonNegativeIntVar(env, "ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE", 1),
    // Clamped up to the live floor so a misconfigured interval cannot undercut
    // the tightest per-user refresh the service defends.
    lineGraphRefreshIntervalMs: Math.max(intVar(env, "ENV_LINE_GRAPH_REFRESH_INTERVAL", 60_000), floors.live),
    maxVotesPerIpPerMinute: intVar(env, "ENV_MAX_VOTES_PER_IP_PER_MINUTE", 600),
    maxLiveResultsPerUser: intVar(env, "ENV_MAX_LIVE_RESULTS_PER_USER", 5),
    maxInvitationsPerDay: intVar(env, "ENV_MAX_INVITATIONS_PER_DAY", 200),
    maxIdleTimeMs: intVar(env, "ENV_MAX_IDLE_TIME", 1_800_000),
    serverMaxRefreshPerInstancePerSecond,
    serverMaxRefreshPerSecond,
    serverMaxSearchPerSecond: intVar(env, "ENV_SERVER_MAX_SEARCH_PER_SECOND", 2_000),
    serverMaxSearchPerSecondFallback: intVar(env, "ENV_SERVER_MAX_SEARCH_PER_SECOND_FALLBACK", 200),
    budgetControllerIntervalMs,
    maxStretch: intVar(env, "ENV_MAX_STRETCH", 8),
    budgetLowerThresholdPercent: intVar(env, "ENV_BUDGET_LOWER_THRESHOLD_PERCENT", 80),
    instanceMaxInflight: intVar(env, "ENV_INSTANCE_MAX_INFLIGHT", 200),
    instanceMaxEventLoopLagMs: intVar(env, "ENV_INSTANCE_MAX_EVENT_LOOP_LAG", 100),
    shedRetryAfterMs: intVar(env, "ENV_SHED_RETRY_AFTER", 2_000),
    counterFlushIntervalMs: intVar(env, "ENV_COUNTER_FLUSH_INTERVAL", 2_000),
    voteBatchSize: intVar(env, "ENV_VOTE_BATCH_SIZE", 500),
    voteQueueLagNoticeMs: intVar(env, "ENV_VOTE_QUEUE_LAG_NOTICE", 2_000),
    searchCacheTtlMs: intVar(env, "ENV_SEARCH_CACHE_TTL", 10_000),
    outboxDrainIntervalMs: intVar(env, "ENV_OUTBOX_DRAIN_INTERVAL", 15_000),
    maxBookmarksPerUser: intVar(env, "ENV_MAX_BOOKMARKS_PER_USER", 200),
    bookmarkExpiryMonths: intVar(env, "ENV_BOOKMARK_EXPIRY_MONTHS", 6),
    pageLoadsPerMinute: intVar(env, "ENV_PAGE_LOADS_PER_MINUTE", 120)
  };
}

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^[|]$/g, "").toLowerCase();
  } catch {
    return undefined;
  }
}

function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "::1" || host.startsWith("127.");
}

function optionalVar(env: Env, name: string): string | undefined {
  const raw = env[name];
  return raw === undefined || raw === "" ? undefined : raw;
}

const SPACES_VARIABLES = [
  "ENV_SPACES_BUCKET",
  "ENV_SPACES_REGION",
  "ENV_SPACES_KEY",
  "ENV_SPACES_SECRET",
  "ENV_SPACES_CDN_URL"
] as const;

function originVar(env: Env, name: string): string | undefined {
  const value = optionalVar(env, name);
  if (value === undefined) return undefined;
  let url: URL | undefined;
  try {
    url = new URL(value);
  } catch {
    url = undefined;
  }
  if (!url || (url.protocol !== "https:" && url.protocol !== "http:") || url.origin !== value.replace(/\/$/, "")) {
    throw new ConfigError(
      `Invalid ${name}: "${value}" — expected an origin such as https://crowdpoll.vote (no path).`
    );
  }
  return url.origin;
}

const PROVIDER_SETTINGS = {
  google: ["ENV_OAUTH_GOOGLE_CLIENT_ID", "ENV_OAUTH_GOOGLE_CLIENT_SECRET"],
  apple: ["ENV_OAUTH_APPLE_CLIENT_ID", "ENV_OAUTH_APPLE_TEAM_ID", "ENV_OAUTH_APPLE_KEY_ID", "ENV_OAUTH_APPLE_PRIVATE_KEY"],
  microsoft: ["ENV_OAUTH_MICROSOFT_CLIENT_ID", "ENV_OAUTH_MICROSOFT_CLIENT_SECRET"],
  amazon: ["ENV_OAUTH_AMAZON_CLIENT_ID", "ENV_OAUTH_AMAZON_CLIENT_SECRET"]
} as const;

export const PROVIDER_NAMES = { google: "Google", apple: "Apple", microsoft: "Microsoft", amazon: "Amazon" } as const;

function oauthProvidersOf(env: Env): OAuthProviders {
  const providers: OAuthProviders = {};
  for (const [provider, names] of Object.entries(PROVIDER_SETTINGS) as [keyof OAuthProviders, readonly string[]][]) {
    const values = names.map((name) => optionalVar(env, name));
    if (values.every((value) => value === undefined)) continue;
    const missing = names.find((_name, index) => values[index] === undefined);
    if (missing) {
      throw new ConfigError(`Incomplete ${PROVIDER_NAMES[provider]} sign-in settings: ${missing} is not set.`);
    }
    const [clientId, second, keyId, privateKey] = values as string[];
    if (provider === "apple") {
      providers.apple = { clientId: clientId!, teamId: second!, keyId: keyId!, privateKey: privateKey!.replace(/\\n/g, "\n") };
    } else {
      providers[provider] = { clientId: clientId!, clientSecret: second! };
    }
  }
  return providers;
}

function allowedEmailKeys(env: Env): Set<string> | undefined {
  const entries = (env.ENV_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  if (entries.length === 0) return undefined;
  for (const entry of entries) {
    if (!EMAIL_PATTERN.test(entry)) {
      throw new ConfigError(`Invalid ENV_ALLOWED_EMAILS: "${entry}" is not an email address.`);
    }
  }
  return new Set(entries.map(emailKeyOf));
}

function sesConfig(env: Env): SesConfig {
  const required = (name: string): string => {
    const value = optionalVar(env, name);
    if (value === undefined) {
      throw new ConfigError(`Invalid ${name}: required when ENV_EMAIL_TRANSPORT=ses.`);
    }
    return value;
  };
  return {
    region: required("ENV_SES_REGION"),
    accessKeyId: required("ENV_SES_ACCESS_KEY_ID"),
    secretAccessKey: required("ENV_SES_SECRET_ACCESS_KEY")
  };
}

function spacesConfig(env: Env): SpacesConfig | undefined {
  const values = SPACES_VARIABLES.map((name) => optionalVar(env, name));
  if (values.every((value) => value === undefined)) return undefined;
  const missing = SPACES_VARIABLES.filter((_name, index) => values[index] === undefined);
  if (missing.length > 0) {
    throw new ConfigError(
      `Invalid Spaces configuration: ${missing.join(", ")} must be set when any ENV_SPACES_* variable is.`
    );
  }
  const [bucket, region, key, secret, cdnUrl] = values as [string, string, string, string, string];
  return { bucket, region, key, secret, cdnUrl };
}
