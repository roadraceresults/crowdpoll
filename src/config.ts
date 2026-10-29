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
  maxSigninCookieDurationMs: number;
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
  betterAuthSecret: string;
  /** 011: bound on one Acceptability Screening call. */
  screeningCallTimeoutMs: number;
  /** 011: how often polls awaiting approval are swept. */
  pollApprovalSweepIntervalMs: number;
  /** 011: how often poll schedules are re-evaluated. */
  pollDateCheckSweepIntervalMs: number;
  /** 011: how often an open editing page signals it is still present. */
  pollEditHeartbeatIntervalMs: number;
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
  emailRateLimitMaxRequestsPerWindow: number;
  /**
   * 012: the voter ceiling on a private poll — serving as both the limit a blank
   * field means and the largest value an administrator may enter, because the
   * requirements make them the same number. Configurable so a test poll can be
   * filled in a handful of votes rather than five hundred.
   */
  maxPrivatePollVoters: number;
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
  trendingPollsRecomputeSweepIntervalMs: number;
  maxNewestPolls: number;
  newestPollsRecomputeSweepIntervalMs: number;
  floors: RefreshFloors;
  bursts: RefreshBursts;
  /** Whole-percent share a choice must exceed to be drawn on the line graph; 0 disables the filter. */
  lineGraphMinVotePercentage: number;
  /** How often the maximized view's line graph refreshes, clamped up to the live-refresh floor. */
  lineGraphRefreshIntervalMs: number;
  maxVotesPerIpPerMinute: number;
  maxLiveResultsPerUser: number;
  maxInvitationsPerDay: number;
  liveResultsMaxIdleTimeMs: number;
  serverMaxRequestsPerInstancePerSecond: number;
  serverMaxRequestsPerSecond: number;
  serverMaxSearchPerSecond: number;
  serverMaxSearchFallbackPerSecond: number;
  budgetControllerSweepIntervalMs: number;
  maxRefreshAndSearchStretch: number;
  budgetLowerThresholdPercent: number;
  instanceMaxInflight: number;
  instanceMaxEventLoopLagMs: number;
  shedRetryAfterMs: number;
  counterFlushSweepIntervalMs: number;
  voteBatchSize: number;
  voteQueueLagNoticeMs: number;
  searchCacheTtlMs: number;
  outboxDrainSweepIntervalMs: number;
  invitationSweepIntervalMs: number;
  maxBookmarksPerUser: number;
  bookmarkExpiryMonths: number;
  pageLoadsPerMinute: number;
  defaultsUsed: readonly DefaultUsed[];
}

export interface DefaultUsed {
  name: string;
  value: string;
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

interface SettingsReader {
  int(name: string, fallback: number): number;
  nonNegativeInt(name: string, fallback: number): number;
  text(name: string, fallback: string): string;
  none(name: string, behaviour: string): void;
  readonly defaultsUsed: DefaultUsed[];
}

function settingsReader(env: Env): SettingsReader {
  const defaultsUsed: DefaultUsed[] = [];
  const useDefault = <T extends string | number>(name: string, fallback: T): T => {
    defaultsUsed.push({ name, value: String(fallback) });
    return fallback;
  };
  return {
    int(name, fallback) {
      const raw = env[name];
      if (raw === undefined || raw === "") return useDefault(name, fallback);
      const value = Number(raw);
      if (!Number.isInteger(value) || value <= 0) {
        throw new ConfigError(
          `Invalid ${name}: "${raw}" — expected a positive integer.`
        );
      }
      return value;
    },
    nonNegativeInt(name, fallback) {
      const raw = env[name];
      if (raw === undefined || raw === "") return useDefault(name, fallback);
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0) {
        throw new ConfigError(
          `Invalid ${name}: "${raw}" — expected a non-negative integer.`
        );
      }
      return value;
    },
    text(name, fallback) {
      const raw = env[name];
      return raw === undefined ? useDefault(name, fallback) : raw;
    },
    none(name, behaviour) {
      defaultsUsed.push({ name, value: behaviour });
    },
    defaultsUsed
  };
}

function byName(a: DefaultUsed, b: DefaultUsed): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

const RENAMED_VARS: Record<string, string> = {
  ENV_BUDGET_CONTROLLER_INTERVAL: "ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL",
  ENV_COUNTER_FLUSH_INTERVAL: "ENV_COUNTER_FLUSH_SWEEP_INTERVAL",
  ENV_POLL_APPROVAL_POLLING_INTERVAL: "ENV_POLL_APPROVAL_SWEEP_INTERVAL",
  ENV_OUTBOX_DRAIN_INTERVAL: "ENV_OUTBOX_DRAIN_SWEEP_INTERVAL",
  ENV_POLL_EDIT_UPDATE_HEARTBEAT_INTERVAL: "ENV_POLL_EDIT_HEARTBEAT_INTERVAL",
  ENV_POLL_DATE_CHECK_POLLING_INTERVAL: "ENV_POLL_DATE_CHECK_SWEEP_INTERVAL",
  ENV_TRENDING_POLLS_RECOMPUTE_INTERVAL: "ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL",
  ENV_NEWEST_POLLS_RECOMPUTE_INTERVAL: "ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL",
  ENV_MIN_SEARCH_INTERVAL: "ENV_MIN_SEARCH_REFRESH_INTERVAL",
  ENV_MIN_VOTE_INTERVAL: "ENV_MIN_VOTE_REFRESH_INTERVAL",
  ENV_MAX_STRETCH: "ENV_MAX_REFRESH_AND_SEARCH_STRETCH",
  ENV_POLL_EDIT_UPDATE_SWEEP_INTERVAL: "ENV_POLL_EDIT_HEARTBEAT_INTERVAL",
  ENV_MAX_IDLE_TIME: "ENV_LIVE_RESULTS_MAX_IDLE_TIME",
  ENV_API_CALL_TIMEOUT: "ENV_SCREENING_CALL_TIMEOUT",
  ENV_SIGNIN_COOKIE_DURATION_MAX: "ENV_MAX_SIGNIN_COOKIE_DURATION",
  ENV_PRIVATE_VOTER_LIMIT_DEFAULT: "ENV_MAX_PRIVATE_POLL_VOTERS",
  ENV_EMAIL_RATE_LIMIT_MINUTES_WINDOW: "ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES",
  ENV_SERVER_MAX_REFRESH_PER_SECOND: "ENV_SERVER_MAX_REQUESTS_PER_SECOND",
  ENV_SERVER_MAX_REFRESH_PER_INSTANCE_PER_SECOND: "ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND",
  ENV_SERVER_MAX_SEARCH_PER_SECOND_FALLBACK: "ENV_SERVER_MAX_SEARCH_FALLBACK_PER_SECOND"
};

export function loadConfig(env: Env = process.env): AppConfig {
  for (const [old, current] of Object.entries(RENAMED_VARS)) {
    if (env[old] !== undefined) throw new ConfigError(`${old} was renamed to ${current}.`);
  }
  const read = settingsReader(env);
  const signinMethod = read.text("ENV_SIGNIN_METHOD", "native");
  if (signinMethod !== "native" && signinMethod !== "oauth" && signinMethod !== "both") {
    throw new ConfigError(
      `Invalid ENV_SIGNIN_METHOD: "${signinMethod}" — expected "native", "oauth" or "both".`
    );
  }
  const nativeSignin = signinMethod !== "oauth";
  const oauthSignin = signinMethod !== "native";
  const oauthProviders = oauthSignin ? oauthProvidersOf(env, read) : {};
  if (oauthSignin && Object.keys(oauthProviders).length === 0) {
    throw new ConfigError(
      `Invalid ENV_SIGNIN_METHOD: "${signinMethod}" needs at least one sign-in provider, and no sign-in provider is configured.`
    );
  }

  const databaseUrl = read.text("ENV_DATABASE_URL", "postgres://localhost:5432/app01");
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
  if (databaseCaCert === undefined) read.none("ENV_DATABASE_CA_CERT", "none (system certificate roots)");

  // A local database with a shared Valkey would trade votes and counter flushes with
  // the instances that use that Valkey, each dropping what its own database lacks.
  // The default database URL is not checked: the build (publish-assets) loads the
  // configuration without the run-time-only ENV_DATABASE_URL and never connects.
  const valkeyUrl = optionalVar(env, "ENV_VALKEY_URL");
  if (valkeyUrl === undefined) read.none("ENV_VALKEY_URL", "none (in-process cache, queue and registry)");
  const databaseHost = env.ENV_DATABASE_URL === undefined ? undefined : hostOf(databaseUrl);
  const valkeyHost = valkeyUrl === undefined ? undefined : hostOf(valkeyUrl);
  if (databaseHost !== undefined && isLocalHost(databaseHost) && valkeyHost !== undefined && !isLocalHost(valkeyHost)) {
    throw new ConfigError(
      `ENV_VALKEY_URL names ${valkeyHost} while ENV_DATABASE_URL names ${databaseHost}: a local database needs a local Valkey, or none (leave ENV_VALKEY_URL unset).`
    );
  }

  // FR-010 (002-smtp-env-config): mandatory in every environment — no fallback.
  const betterAuthSecret = env.ENV_BETTER_AUTH_SECRET;
  if (!betterAuthSecret || betterAuthSecret.length < 32) {
    throw new ConfigError(
      "Invalid ENV_BETTER_AUTH_SECRET: this required variable must be set to a secret of at least 32 characters. " +
        "Run devScripts.example/setup-dev.ps1 to generate one for local development."
    );
  }

  const publicOrigin = originVar(env, "ENV_PUBLIC_ORIGIN");
  if (publicOrigin === undefined) {
    throw new ConfigError("Invalid ENV_PUBLIC_ORIGIN: this required variable must be set to the site's origin, such as https://crowdpoll.vote.");
  }

  const emailTransport = read.text("ENV_EMAIL_TRANSPORT", "smtp");
  if (emailTransport !== "smtp" && emailTransport !== "ses") {
    throw new ConfigError(`Invalid ENV_EMAIL_TRANSPORT: "${emailTransport}" — expected "smtp" or "ses".`);
  }

  const minChoices = read.int("ENV_MIN_CHOICES", 2);
  const maxChoices = read.int("ENV_MAX_CHOICES", 50);
  if (maxChoices < minChoices) {
    throw new ConfigError(
      `Invalid ENV_MAX_CHOICES: ${maxChoices} — must be at least ENV_MIN_CHOICES (${minChoices}).`
    );
  }

  const floors: RefreshFloors = {
    live: read.int("ENV_MIN_LIVE_REFRESH_INTERVAL", 2_000),
    refresh: read.int("ENV_MIN_MANUAL_REFRESH_INTERVAL", 5_000),
    search: read.int("ENV_MIN_SEARCH_REFRESH_INTERVAL", 2_000),
    vote: read.int("ENV_MIN_VOTE_REFRESH_INTERVAL", 2_000)
  };
  const bursts: RefreshBursts = {
    live: 1,
    refresh: read.int("ENV_MANUAL_REFRESH_BURST", 5),
    search: read.int("ENV_SEARCH_BURST", 3),
    vote: 1
  };
  const budgetControllerSweepIntervalMs = read.int("ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL", 1_000);
  const smallestFloor = Math.min(...Object.values(floors));
  if (budgetControllerSweepIntervalMs > smallestFloor) {
    throw new ConfigError(
      `Invalid ENV_BUDGET_CONTROLLER_SWEEP_INTERVAL: ${budgetControllerSweepIntervalMs} — must not exceed the smallest refresh floor (${smallestFloor}).`
    );
  }

  const maxPollsSearchResults = read.int("ENV_MAX_POLLS_SEARCH_RESULTS", 200);
  const maxNewestPolls = read.int("ENV_MAX_NEWEST_POLLS", 50);
  if (maxNewestPolls > maxPollsSearchResults) {
    throw new ConfigError(
      `Invalid ENV_MAX_NEWEST_POLLS: ${maxNewestPolls} — must not exceed ENV_MAX_POLLS_SEARCH_RESULTS (${maxPollsSearchResults}).`
    );
  }
  const newestPollsRecomputeSweepIntervalMs = read.int("ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL", 60_000);
  if (newestPollsRecomputeSweepIntervalMs < 1000) {
    throw new ConfigError(
      `Invalid ENV_NEWEST_POLLS_RECOMPUTE_SWEEP_INTERVAL: ${newestPollsRecomputeSweepIntervalMs} — must be at least 1000.`
    );
  }

  const serverMaxRequestsPerInstancePerSecond = read.int("ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND", 1_250);
  const serverMaxRequestsPerSecond = read.int("ENV_SERVER_MAX_REQUESTS_PER_SECOND", 15_000);
  if (serverMaxRequestsPerSecond < serverMaxRequestsPerInstancePerSecond) {
    throw new ConfigError(
      `Invalid ENV_SERVER_MAX_REQUESTS_PER_SECOND: ${serverMaxRequestsPerSecond} — must be at least ENV_SERVER_MAX_REQUESTS_PER_INSTANCE_PER_SECOND (${serverMaxRequestsPerInstancePerSecond}).`
    );
  }

  const admins = read.text("ENV_ADMINS", "roadraceresults@gmail.com")
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
  if (prototypes.length === 0) read.none("ENV_PROTOTYPES", "none (no prototypes served)");

  const openSearchUrl = optionalVar(env, "ENV_OPENSEARCH_URL");
  if (openSearchUrl === undefined) read.none("ENV_OPENSEARCH_URL", "none (PostgreSQL full-text search)");
  const emailAssetOrigin = originVar(env, "ENV_EMAIL_ASSET_ORIGIN");
  if (emailAssetOrigin === undefined) read.none("ENV_EMAIL_ASSET_ORIGIN", "none (each link's own origin)");
  const allowedKeys = allowedEmailKeys(env);
  if (allowedKeys === undefined) read.none("ENV_ALLOWED_EMAILS", "none (allowlist off: everyone may sign in)");
  if (!env.ENV_STAY_SIGNED_IN?.trim()) read.none("ENV_STAY_SIGNED_IN", "0 (the Stay signed in box starts clear)");
  for (const name of ["ENV_SMTP_USER", "ENV_SMTP_PASS"]) {
    if (!env[name]) read.none(name, "none (emails logged to the console, not sent)");
  }
  const spaces = spacesConfig(env, read);

  return {
    port: read.int("ENV_PORT", 8080),
    databaseUrl,
    databaseCaCert,
    valkeyUrl,
    openSearchUrl,
    spaces,
    admins,
    prototypes,
    maxSigninCookieDurationMs: read.int("ENV_MAX_SIGNIN_COOKIE_DURATION", 2_592_000_000),
    staySignedInDefault: env.ENV_STAY_SIGNED_IN?.trim() === "1",
    signinMethod,
    nativeSignin,
    oauthSignin,
    oauthProviders,
    publicOrigin,
    betterAuthSecret,
    // 011 new settings — see specs/011-SIMPLIFY-POLL-STATES/data-model.md
    screeningCallTimeoutMs: read.int("ENV_SCREENING_CALL_TIMEOUT", 10_000),
    pollApprovalSweepIntervalMs: read.int("ENV_POLL_APPROVAL_SWEEP_INTERVAL", 5_000),
    pollDateCheckSweepIntervalMs: read.int("ENV_POLL_DATE_CHECK_SWEEP_INTERVAL", 60_000),
    pollEditHeartbeatIntervalMs: read.int("ENV_POLL_EDIT_HEARTBEAT_INTERVAL", 10_000),
    maxAcceptabilityScreeningAttempts: read.int("ENV_MAX_ACCEPTABILITY_SCREENING_ATTEMPTS", 10),
    pollAdminPageRefreshIntervalMs: read.int("ENV_POLL_ADMIN_PAGE_REFRESH_INTERVAL", 5_000),
    participantsViewportSize: read.int("ENV_PARTICIPANTS_VIEWPORT_SIZE", 10),
    // 012: was a hard-coded 15 minutes / 2 requests. The window is expressed in
    // minutes here; auth.ts converts to the seconds the limiter takes.
    emailRateLimitWindowMinutes: read.int("ENV_EMAIL_RATE_LIMIT_WINDOW_MINUTES", 15),
    emailRateLimitMaxRequestsPerWindow: read.int("ENV_EMAIL_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW", 2),
    maxPrivatePollVoters: read.int("ENV_MAX_PRIVATE_POLL_VOTERS", 100),
    minChoices,
    maxChoices,
    smtp: {
      host: read.text("ENV_SMTP_HOST", "sandbox.smtp.mailtrap.io"),
      port: read.int("ENV_SMTP_PORT", 2525),
      user: env.ENV_SMTP_USER,
      pass: env.ENV_SMTP_PASS
    },
    emailTransport,
    ses: emailTransport === "ses" ? sesConfig(env) : undefined,
    emailFrom: read.text("ENV_EMAIL_FROM", "CrowdPoll <no-reply@mail.crowdpoll.vote>"),
    emailAssetOrigin,
    allowedEmailKeys: allowedKeys,
    emailSendTimeoutMs: read.int("ENV_EMAIL_SEND_TIMEOUT", 10_000),
    sessionCacheTtlMs: read.int("ENV_SESSION_CACHE_TTL", 300_000),
    maxPollsSearchResults,
    maxPollsAdminSearchResults: read.int("ENV_MAX_POLLS_ADMIN_SEARCH_RESULTS", 200),
    maxTrendingPolls: read.int("ENV_MAX_TRENDING_POLLS", 200),
    trendingPollsRecomputeSweepIntervalMs: read.int("ENV_TRENDING_POLLS_RECOMPUTE_SWEEP_INTERVAL", 60_000),
    maxNewestPolls,
    newestPollsRecomputeSweepIntervalMs,
    floors,
    bursts,
    lineGraphMinVotePercentage: read.nonNegativeInt("ENV_LINE_GRAPH_MIN_VOTE_PERCENTAGE", 1),
    // Clamped up to the live floor so a misconfigured interval cannot undercut
    // the tightest per-user refresh the service defends.
    lineGraphRefreshIntervalMs: Math.max(read.int("ENV_LINE_GRAPH_REFRESH_INTERVAL", 60_000), floors.live),
    maxVotesPerIpPerMinute: read.int("ENV_MAX_VOTES_PER_IP_PER_MINUTE", 600),
    maxLiveResultsPerUser: read.int("ENV_MAX_LIVE_RESULTS_PER_USER", 5),
    maxInvitationsPerDay: read.int("ENV_MAX_INVITATIONS_PER_DAY", 200),
    liveResultsMaxIdleTimeMs: read.int("ENV_LIVE_RESULTS_MAX_IDLE_TIME", 1_800_000),
    serverMaxRequestsPerInstancePerSecond,
    serverMaxRequestsPerSecond,
    serverMaxSearchPerSecond: read.int("ENV_SERVER_MAX_SEARCH_PER_SECOND", 2_000),
    serverMaxSearchFallbackPerSecond: read.int("ENV_SERVER_MAX_SEARCH_FALLBACK_PER_SECOND", 200),
    budgetControllerSweepIntervalMs,
    maxRefreshAndSearchStretch: read.int("ENV_MAX_REFRESH_AND_SEARCH_STRETCH", 8),
    budgetLowerThresholdPercent: read.int("ENV_BUDGET_LOWER_THRESHOLD_PERCENT", 80),
    instanceMaxInflight: read.int("ENV_INSTANCE_MAX_INFLIGHT", 200),
    instanceMaxEventLoopLagMs: read.int("ENV_INSTANCE_MAX_EVENT_LOOP_LAG", 100),
    shedRetryAfterMs: read.int("ENV_SHED_RETRY_AFTER", 2_000),
    counterFlushSweepIntervalMs: read.int("ENV_COUNTER_FLUSH_SWEEP_INTERVAL", 10_000),
    voteBatchSize: read.int("ENV_VOTE_BATCH_SIZE", 500),
    voteQueueLagNoticeMs: read.int("ENV_VOTE_QUEUE_LAG_NOTICE", 2_000),
    searchCacheTtlMs: read.int("ENV_SEARCH_CACHE_TTL", 10_000),
    outboxDrainSweepIntervalMs: read.int("ENV_OUTBOX_DRAIN_SWEEP_INTERVAL", 15_000),
    invitationSweepIntervalMs: read.int("ENV_INVITATION_SWEEP_INTERVAL", 30_000),
    maxBookmarksPerUser: read.int("ENV_MAX_BOOKMARKS_PER_USER", 200),
    bookmarkExpiryMonths: read.int("ENV_BOOKMARK_EXPIRY_MONTHS", 6),
    pageLoadsPerMinute: read.int("ENV_PAGE_LOADS_PER_MINUTE", 120),
    defaultsUsed: read.defaultsUsed
      .filter((entry) => emailTransport === "smtp" || !entry.name.startsWith("ENV_SMTP_"))
      .sort(byName)
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

function oauthProvidersOf(env: Env, read: SettingsReader): OAuthProviders {
  const providers: OAuthProviders = {};
  for (const [provider, names] of Object.entries(PROVIDER_SETTINGS) as [keyof OAuthProviders, readonly string[]][]) {
    const values = names.map((name) => optionalVar(env, name));
    if (values.every((value) => value === undefined)) {
      read.none(`ENV_OAUTH_${provider.toUpperCase()}_*`, `none (${PROVIDER_NAMES[provider]} sign-in off)`);
      continue;
    }
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

function spacesConfig(env: Env, read: SettingsReader): SpacesConfig | undefined {
  const values = SPACES_VARIABLES.map((name) => optionalVar(env, name));
  if (values.every((value) => value === undefined)) {
    read.none("ENV_SPACES_*", "none (TRENDING objects and assets served from the instance)");
    return undefined;
  }
  const missing = SPACES_VARIABLES.filter((_name, index) => values[index] === undefined);
  if (missing.length > 0) {
    throw new ConfigError(
      `Invalid Spaces configuration: ${missing.join(", ")} must be set when any ENV_SPACES_* variable is.`
    );
  }
  const [bucket, region, key, secret, cdnUrl] = values as [string, string, string, string, string];
  return { bucket, region, key, secret, cdnUrl };
}
