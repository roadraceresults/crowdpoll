import compression from "compression";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { toNodeHandler } from "better-auth/node";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadConfig, ConfigError, PROVIDER_NAMES, type AppConfig } from "./config.js";
import { createAuth, type Auth } from "./auth/auth.js";
import { logAppleSecretExpiry, startAppleSecretRefresh } from "./auth/appleSecret.js";
import { allowlistStatus } from "./auth/allowlist.js";
import { createSessionCache, type SessionCache } from "./auth/sessionCache.js";
import { createTermsGate } from "./legal/termsGate.js";
import { createCache, type Cache } from "./cache/cache.js";
import { createDb, closeDb, type Db } from "./db/client.js";
import { migrateToLatest } from "./db/migrator.js";
import { initMailer } from "./email/mailer.js";
import { createBudget, type Budget } from "./load/budget.js";
import { createFloors } from "./load/floors.js";
import { createPageLoadBucket } from "./load/pageLoads.js";
import { createShedding, type Shedding } from "./load/shedding.js";
import { createApiRouter } from "./routes/api.js";
import { createHealthRouter } from "./routes/healthz.js";
import { createPagesRouter } from "./routes/pages.js";
import { createPrototypesRouter } from "./routes/prototypes.js";
import { createPollsApiRouter, createVoteRouter } from "./routes/pollsApi.js";
import { createTabsApiRouter } from "./routes/tabsApi.js";
import { buildSweepSchedules, startSweeps } from "./polls/sweeps.js";
import { createListingPublisher, createSpacesStore, NEWEST_OBJECTS, TRENDING_OBJECTS, type Publisher } from "./trending/publish.js";
import { createSearch, type Search } from "./search/search.js";
import { createRosterCache, type RosterCache } from "./votes/rosterCache.js";
import { createConsumer, type Consumer } from "./votes/consumer.js";
import { createLiveRegistry, type LiveRegistry } from "./live/registry.js";
import { VOTE_STREAM, VOTE_GROUP } from "./votes/queue.js";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");

export interface AppDeps {
  auth: Auth;
  db: Db;
  cache: Cache;
  config: AppConfig;
}

export interface AppContext extends AppDeps {
  sessions: SessionCache;
  budget: Budget;
  shedding: Shedding;
  floors: ReturnType<typeof createFloors>;
  pageLoads: ReturnType<typeof createPageLoadBucket>;
  abuse: { ipVoteCap: number };
  trendingPublisher: Publisher;
  newestPublisher: Publisher;
  search: Search;
  rosters: RosterCache;
  consumer: Consumer;
  live: LiveRegistry;
}

export function createAppContext(deps: AppDeps): AppContext {
  const sessions = createSessionCache({
    auth: deps.auth,
    db: deps.db,
    cache: deps.cache,
    ttlMs: deps.config.sessionCacheTtlMs
  });
  const budget = createBudget(deps.config, deps.cache);
  const shedding = createShedding({ config: deps.config, cache: deps.cache, budget });
  const floors = createFloors({ config: deps.config, cache: deps.cache, sessions, budget });
  const pageLoads = createPageLoadBucket({ config: deps.config, cache: deps.cache, sessions });
  const store = deps.config.spaces ? createSpacesStore(deps.config.spaces) : null;
  const trendingPublisher = createListingPublisher(store, deps.config.trendingRecomputeIntervalMs, TRENDING_OBJECTS);
  const newestPublisher = createListingPublisher(store, deps.config.newestRecomputeIntervalMs, NEWEST_OBJECTS);
  const search = createSearch({
    db: deps.db,
    cache: deps.cache,
    config: deps.config,
    onEngineQuery: () => budget.countEngineQuery()
  });
  const rosters = createRosterCache(deps.db, deps.cache);
  const consumer = createConsumer({ db: deps.db, cache: deps.cache, config: deps.config, consumerName: budget.instanceId });
  const live = createLiveRegistry({ db: deps.db, cache: deps.cache, config: deps.config, rosters });
  return { ...deps, sessions, budget, shedding, floors, pageLoads, abuse: { ipVoteCap: 0 }, trendingPublisher, newestPublisher, search, rosters, consumer, live };
}

export function createApp(context: AppContext): Express {
  const { auth, config, cache, shedding, abuse } = context;
  const app = express();
  app.set("trust proxy", true);
  app.disable("x-powered-by");

  app.use(createHealthRouter({ cache, shedding, abuseCounts: () => ({ ...abuse }) }));
  app.use(compression());
  app.use(shedding.countInFlight);

  // The provider sign-in routes are the library's own handler, mounted path by path so the email routes
  // stay CrowdPoll's in both mode, and before the JSON parser, since it reads its own body (research R3).
  if (config.oauthSignin) {
    const handler = toNodeHandler(auth);
    app.post("/api/auth/sign-in/social", handler);
    app.get("/api/auth/callback/:provider", handler);
    app.post("/api/auth/callback/:provider", handler);
    app.post("/api/auth/sign-in/oauth2", handler);
    app.get("/api/auth/oauth2/callback/:providerId", handler);
  }

  app.use("/api", express.json());
  app.use(createTermsGate(context));
  app.use(createTabsApiRouter(context));
  app.use(createVoteRouter(context));
  app.use(shedding.shedOther);
  app.use(createPagesRouter(context));
  app.use(createApiRouter(context));
  app.use(createPollsApiRouter(context));
  app.use(createPrototypesRouter(config));

  // Pages are served by their clean routes only; assets come from static.
  app.use((req, res, next) => {
    if (req.path.endsWith(".html")) {
      res.redirect(req.path.slice(0, -".html".length) || "/");
      return;
    }
    next();
  });
  app.use(express.static(publicDir, { index: false }));

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    console.error(`[server] Error handling ${req.method} ${req.path}:`, err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Something went wrong, please try again later" });
  });

  return app;
}

function providerList(config: AppConfig): string {
  const names = Object.keys(config.oauthProviders).map((key) => PROVIDER_NAMES[key as keyof typeof PROVIDER_NAMES]);
  return names.length > 0 ? names.join(", ") : "none";
}

export async function startServer(): Promise<void> {
  let config: AppConfig;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`[config] ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  console.log(`[server] Starting in ${config.signinMethod} sign-in mode`);
  console.log(`[auth] Sign-in method: ${config.signinMethod}; providers: ${providerList(config)}`);
  console.log(allowlistStatus(config));
  console.log(
    config.databaseCaCert
      ? `[db] Verifying the database certificate against ENV_DATABASE_CA_CERT (${config.databaseCaCert.length} characters)`
      : "[db] ENV_DATABASE_CA_CERT is not set: verifying the database certificate against the system roots"
  );
  const db = createDb(config.databaseUrl, { caCert: config.databaseCaCert });
  try {
    const applied = await migrateToLatest(db);
    console.log(
      applied.length > 0
        ? `[server] Applied ${applied.length} migration(s): ${applied.join(", ")}`
        : "[server] Database schema is up to date"
    );
  } catch (err) {
    console.error("[server] Database migration failed; refusing to start:", err);
    await closeDb(db);
    process.exit(1);
  }

  let cache: Cache;
  try {
    cache = await createCache(config);
  } catch (err) {
    console.error("[server] Could not reach the cache; refusing to start:", err);
    await closeDb(db);
    process.exit(1);
  }
  await cache.xgroupCreate(VOTE_STREAM, VOTE_GROUP);

  initMailer(config);
  const auth = createAuth(db, config, cache);
  const apple = config.oauthProviders.apple;
  let stopAppleRefresh = () => {};
  if (apple) {
    logAppleSecretExpiry();
    stopAppleRefresh = startAppleSecretRefresh(auth.options.socialProviders.apple!, apple);
  }
  const context = createAppContext({ auth, db, cache, config });
  if (context.search.openSearch) {
    try {
      await context.search.openSearch.ensureIndex();
    } catch (err) {
      console.error("[search] Could not prepare the OpenSearch index; PostgreSQL full-text search will serve:", err);
    }
  }
  console.log(`[search] ${await context.search.servingEngine()} is serving home search`);
  console.log(
    config.spaces
      ? `[spaces] TRENDING and Newest objects publish to bucket "${config.spaces.bucket}" (${config.spaces.region}); browsers read them from ${config.spaces.cdnUrl}`
      : "[spaces] Not configured: TRENDING and Newest objects are served from this instance"
  );
  const app = createApp(context);

  const stopHeartbeat = context.budget.startHeartbeat();
  const sweeps = startSweeps(context, buildSweepSchedules(config, context));
  context.consumer.start();

  const server = app.listen(config.port, () => {
    console.log(`[server] Listening on http://localhost:${config.port} (${config.signinMethod} mode)`);
  });

  let stopping = false;
  const stop = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[server] ${signal} received; shutting down`);
    server.close();
    await context.consumer.stop();
    sweeps.stop();
    stopHeartbeat();
    stopAppleRefresh();
    context.shedding.stop();
    await cache.close();
    await closeDb(db);
    console.log("[server] Shutdown complete");
    process.exit(0);
  };
  process.once("SIGTERM", () => void stop("SIGTERM"));
  process.once("SIGINT", () => void stop("SIGINT"));
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  startServer().catch((err) => {
    console.error("[server] Fatal startup error:", err);
    process.exit(1);
  });
}
