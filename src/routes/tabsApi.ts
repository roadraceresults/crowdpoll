import { Router, type Request, type RequestHandler, type Response } from "express";
import type { AppContext } from "../server.js";
import { listingMaxAgeMs } from "../trending/publish.js";
import type { PollRow } from "../db/schema.js";
import { readOrRebuildCounts } from "../polls/counters.js";
import { overlay, sharedWithYouKept, sharedWithYouTab, watchingTab, yourPollsTab, yourVotesTab, type OverlayEntry } from "../polls/userPolls.js";
import { POLL_PROJECTION_KEY, projectPoll, refreshProjection, type PollProjection } from "../polls/versions.js";
import { computeDelta, parseClientVersions, type ClientVersions, type CurrentListing, type Delta } from "../refresh/deltas.js";
import {
  countStat,
  ensureVersion,
  parseSeen,
  recordSeen,
  shortcutAnswerable,
  TAB_SEEN_KEY,
  TAB_VERSION_KEY,
  TABS_FAST_KEY,
  TABS_FULL_KEY
} from "../refresh/tabVersions.js";
import { etagOf, readNewestObjects, readTrendingObjects } from "../trending/recompute.js";
import type { Cache } from "../cache/cache.js";
import { liveTabDelta } from "../live/liveTab.js";
import { holdsPermission, NO_VIEW_PERMISSION, NO_VOTE_PERMISSION, type Caller } from "../polls/service.js";
import { decideSharedLink, parsePid } from "../polls/sharedLink.js";
import { adoptInvitations, markAccepted } from "../invitations/invitations.js";
import { isPublished } from "../polls/store.js";
import { ACCESS_COLUMNS, mayWatchMany, reachableMany } from "../polls/access.js";
import type { PersonalTab } from "../polls/userPolls.js";
import type { RequestKind } from "../load/budget.js";

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

export function createTabsApiRouter(context: AppContext): Router {
  const { db, cache, config, sessions, shedding, floors, budget, search, live, pageLoads } = context;
  const router = Router();

  const countBudget = (kind: RequestKind): RequestHandler => (_req, _res, next) => {
    budget.countRequest(kind).then(() => next(), next);
  };
  const dynamic = (kind: Exclude<RequestKind, "other">): RequestHandler[] => [
    shedding.withKind(kind),
    floors.enforceFloor(kind),
    countBudget(kind)
  ];
  const requireSession: RequestHandler = (req, res, next) => {
    sessions
      .getSession(req)
      .then((session) => {
        if (!session) {
          res.status(401).json({ error: "Not signed in" });
          return;
        }
        res.locals.session = session;
        next();
      })
      .catch(next);
  };
  const emailOf = (res: Response): string => String((res.locals.session as { user: { email: string } }).user.email).toLowerCase();
  const userIdOf = (res: Response): string => String((res.locals.session as { user: { id: string } }).user.id);
  const callerOf = (res: Response): Caller => (res.locals.session as { user: Caller }).user;

  async function count(key: string): Promise<void> {
    await countStat(cache, key).catch((err: unknown) => console.error(`[tabs] Could not count ${key}:`, err));
  }

  /** One read of the cached projections; writes, in one call, those missing or older than their row. */
  async function writeProjections(rows: PollRow[]): Promise<void> {
    if (rows.length === 0) return;
    try {
      const cached = await cache.getMany(rows.map((row) => POLL_PROJECTION_KEY(row.id)));
      const stale = rows.filter((row, i) => {
        const raw = cached[i];
        return !raw || (JSON.parse(raw) as PollProjection).contentVersion !== row.content_version;
      });
      await cache.setMany(stale.map((row) => ({ key: POLL_PROJECTION_KEY(row.id), value: JSON.stringify(projectPoll(row)) })));
    } catch (err) {
      console.error("[tabs] Could not refresh the cached projections:", err);
    }
  }

  function sendDelta(res: Response, delta: ReturnType<typeof computeDelta>): void {
    if (delta.status === 304) {
      res.status(304).end();
      return;
    }
    res.json({ ...delta.body, nextRefreshMs: res.locals.nextRefreshMs });
  }

  // ---- TRENDING and Newest, instance-served when no delivery network is configured ----

  function serveListingObject(
    read: (cache: Cache) => Promise<{ counts: string; cards: string } | null>,
    notReady: string,
    intervalMs: number,
    which: "counts" | "cards"
  ): RequestHandler {
    return wrap(async (req, res) => {
      const objects = await read(cache);
      if (!objects) {
        res.status(503).json({ error: notReady, retryAfterMs: 5000 });
        return;
      }
      const body = objects[which];
      const etag = etagOf(body);
      res.setHeader("Cache-Control", `public, max-age=${Math.floor(listingMaxAgeMs(intervalMs) / 1000)}`);
      res.setHeader("ETag", etag);
      if (req.headers["if-none-match"] === etag) {
        res.status(304).end();
        return;
      }
      res.type("application/json").send(body);
    });
  }
  const trendingObject = (which: "counts" | "cards") =>
    serveListingObject(readTrendingObjects, "trending-not-ready", config.trendingRecomputeIntervalMs, which);
  const newestObject = (which: "counts" | "cards") =>
    serveListingObject(readNewestObjects, "newest-not-ready", config.newestRecomputeIntervalMs, which);
  router.get(["/api/trending/counts", "/api/trending/trending-counts.json"], pageLoads, trendingObject("counts"));
  router.get(["/api/trending/cards", "/api/trending/trending.json"], pageLoads, trendingObject("cards"));
  router.get(["/api/trending/newest-counts", "/api/trending/newest-counts.json"], pageLoads, newestObject("counts"));
  router.get(["/api/trending/newest-cards", "/api/trending/newest.json"], pageLoads, newestObject("cards"));

  // ---- Personal tabs ----

  async function voteBlocks(caller: Caller, email: string, userId: string, rows: PollRow[]): Promise<Map<string, string>> {
    const pids = rows.map((r) => r.id);
    if (pids.length === 0) return new Map();
    if (!holdsPermission(caller, "Vote on Polls", config)) {
      return new Map(pids.map((pid) => [pid, NO_VOTE_PERMISSION]));
    }
    const [bans, invitations] = await Promise.all([
      db.selectFrom("poll_bans").select("poll_id").where("email", "=", email).where("poll_id", "in", pids).execute(),
      db.selectFrom("poll_invitations").select("poll_id").where("email", "=", email).where("poll_id", "in", pids).execute()
    ]);
    const banned = new Set(bans.map((b) => b.poll_id));
    const invited = new Set(invitations.map((i) => i.poll_id));
    const blocks = new Map<string, string>();
    for (const row of rows) {
      if (banned.has(row.id)) {
        blocks.set(row.id, "You have been removed from this poll and cannot vote in it.");
      } else if (
        row.poll_visibility === "Private Poll" &&
        row.poll_sharing_mode === "Invitation Only" &&
        !invited.has(row.id) &&
        row.created_by_id !== userId
      ) {
        blocks.set(row.id, "You are not invited to this poll.");
      }
    }
    return blocks;
  }

  function projectWithReason(row: PollRow, withReason: boolean) {
    const projection = projectPoll(row);
    return withReason && row.poll_state === "REJECTED" ? { ...projection, rejectionReason: row.poll_rejection_reason ?? "" } : projection;
  }

  async function personalListing(
    res: Response,
    tab: { rows: PollRow[]; membershipVersion: string | null; relations: Map<string, OverlayEntry["relations"]> },
    options: { rejectionReasons?: boolean } = {}
  ): Promise<CurrentListing> {
    const email = emailOf(res);
    const userId = userIdOf(res);
    const order = tab.rows.map((r) => r.id);
    const readable = tab.rows.filter((r) => isPublished(r) || r.created_by_id === userId);
    const readableIds = readable.map((r) => r.id);
    const readableSet = new Set(readableIds);
    const projections: CurrentListing["projections"] = new Map(
      tab.rows.map((r) => [
        r.id,
        readableSet.has(r.id) ? projectWithReason(r, options.rejectionReasons === true && r.created_by_id === userId) : { pid: r.id, notPublished: true as const, createdByName: r.created_by_name, contentVersion: 0 }
      ])
    );
    const [counts, mine, blocks, watchable] = await Promise.all([
      readOrRebuildCounts({ db, cache }, readableIds),
      overlay(db, email, readableIds),
      voteBlocks(callerOf(res), email, userId, readable),
      mayWatchMany({ db, config }, callerOf(res), readable)
    ]);
    const overlayWithBlocks: CurrentListing["overlay"] = {};
    for (const pid of readableIds) {
      const entry: OverlayEntry = mine[pid] ?? { voted: false, bookmarked: false };
      overlayWithBlocks[pid] = {
        ...entry,
        mayWatch: watchable.has(pid),
        relations: tab.relations.get(pid) ?? [],
        voteBlockedReason: blocks.get(pid) ?? null
      };
    }
    return { membershipVersion: tab.membershipVersion, order, projections, counts, overlay: overlayWithBlocks };
  }

  const narrowTo = (tab: PersonalTab, kept: Set<string>): PersonalTab => ({ ...tab, rows: tab.rows.filter((row) => kept.has(row.id)) });

  /** The answer from the live counts alone, when nothing the tab shows can have changed since it was last sent. */
  async function shortcut(email: string, name: string, request: ClientVersions): Promise<Delta | null> {
    try {
      const [version, raw] = await cache.getMany([TAB_VERSION_KEY(email), TAB_SEEN_KEY(email, name)]);
      const seen = parseSeen(raw ?? null);
      if (!seen || !version) return null;
      const cached = await cache.getMany(seen.rows.map(([pid]) => POLL_PROJECTION_KEY(pid)));
      const projections = new Map(seen.rows.map(([pid], i) => [pid, cached[i] ? (JSON.parse(cached[i]!) as PollProjection) : null]));
      if (!shortcutAnswerable(seen, version, request, projections)) return null;
      const sent = new Map(seen.rows.map(([pid, , sentVersion]) => [pid, sentVersion]));
      const listed: CurrentListing["projections"] = new Map(
        seen.order.map((pid) => [
          pid,
          sent.get(pid) === 0 ? { pid, notPublished: true as const, createdByName: "", contentVersion: 0 } : projections.get(pid)!
        ])
      );
      const counts = await readOrRebuildCounts({ db, cache }, seen.order.filter((pid) => sent.get(pid) !== 0));
      return computeDelta(request, { membershipVersion: seen.membershipVersion, order: seen.order, projections: listed, counts });
    } catch (err) {
      console.error(`[tabs] The ${name} shortcut failed; building the full answer:`, err);
      return null;
    }
  }

  const personalTabRoute = (
    name: string,
    load: (db: typeof context.db, email: string, userId: string, cap: number) => ReturnType<typeof yourPollsTab>,
    narrow: (tab: PersonalTab, caller: Caller, email: string) => Promise<PersonalTab> = async (tab) => tab
  ): void => {
    router.post(
      `/api/tabs/${name}/refresh`,
      requireSession,
      ...dynamic("refresh"),
      wrap(async (req, res) => {
        const request = parseClientVersions(req.body);
        const options = { rejectionReasons: name === "your-polls" };
        if (!holdsPermission(callerOf(res), "View Polls", config)) {
          sendDelta(res, computeDelta(request, await personalListing(res, { rows: [], membershipVersion: null, relations: new Map() }, options)));
          return;
        }
        const email = emailOf(res);
        const fast = await shortcut(email, name, request);
        if (fast) {
          await count(TABS_FAST_KEY);
          sendDelta(res, fast);
          return;
        }
        const version = await ensureVersion(cache, email).catch(() => null);
        const loaded = await load(db, email, userIdOf(res), config.maxPollsSearchResults);
        await writeProjections(loaded.rows);
        const listing = await personalListing(res, await narrow(loaded, callerOf(res), email), options);
        if (version !== null) {
          const ordered = new Set(listing.order);
          await recordSeen(cache, email, name, {
            v: version,
            membershipVersion: listing.membershipVersion,
            order: listing.order,
            rows: loaded.rows.map((row) => [
              row.id,
              row.content_version,
              ordered.has(row.id) ? (listing.projections.get(row.id)?.contentVersion ?? 0) : row.content_version
            ])
          }).catch((err: unknown) => console.error(`[tabs] Could not record the ${name} answer:`, err));
        }
        await count(TABS_FULL_KEY);
        sendDelta(res, computeDelta(request, listing));
      })
    );
  };
  personalTabRoute("your-polls", (db, email, _userId, cap) => yourPollsTab(db, email, cap));
  personalTabRoute(
    "shared-with-you",
    async (db, email, userId, cap) => {
      await adoptInvitations({ db, cache }, email);
      return sharedWithYouTab(db, email, userId, cap);
    },
    async (tab, _caller, email) => {
      const narrowed = narrowTo(tab, await sharedWithYouKept(db, email, tab.rows));
      const invited = narrowed.rows.filter((row) => row.poll_sharing_mode === "Invitation Only");
      await markAccepted(db, invited.map((row) => row.id), email);
      return narrowed;
    }
  );
  personalTabRoute(
    "your-votes",
    (db, email, _userId, cap) => yourVotesTab(db, email, cap),
    async (tab, caller) => narrowTo(tab, await reachableMany({ db, config }, caller, tab.rows))
  );
  personalTabRoute(
    "watching",
    (db, email, _userId, cap) => watchingTab(db, email, cap),
    async (tab, caller) => narrowTo(tab, await mayWatchMany({ db, config }, caller, tab.rows))
  );

  // ---- Search ----

  async function answerSearch(req: Request, res: Response): Promise<void> {
    const session = await sessions.getSession(req);
    if (session && !holdsPermission(session.user as Caller, "View Polls", config)) {
      res.status(403).json({ error: NO_VIEW_PERMISSION, code: "no-view-permission" });
      return;
    }
    const q = typeof req.body?.q === "string" ? req.body.q : "";
    const result = await search.search("home", q, config.maxPollsSearchResults);
    await writeProjections(result.rows);
    const counts = await readOrRebuildCounts({ db, cache }, result.rows.map((r) => r.id));
    res.json({
      results: result.rows.map((row) => ({
        ...projectPoll(row),
        counts: counts.get(row.id) ?? { voteCount: 0, choiceCounts: {}, countsVersion: 0 }
      })),
      truncated: result.truncated,
      nextRefreshMs: res.locals.nextRefreshMs
    });
  }

  router.post("/api/search", ...dynamic("search"), wrap(answerSearch));
  router.post("/api/search/refresh", ...dynamic("refresh"), wrap(answerSearch));

  // ---- Live Results ----

  const sessionIdOf = (res: Response): string => String((res.locals.session as { session: { id: string } }).session.id);
  const liveSession = (res: Response) => ({ id: sessionIdOf(res), email: emailOf(res), userId: userIdOf(res) });

  router.post(
    "/api/live/refresh",
    requireSession,
    ...dynamic("live"),
    wrap(async (req, res) => {
      const sessionId = sessionIdOf(res);
      if (!(await live.isRegistered(sessionId))) {
        res.status(403).json({ error: "live-expired" });
        return;
      }
      const pids = holdsPermission(callerOf(res), "View Polls", config) ? await live.polls(sessionId) : [];
      const nextRefreshMs = res.locals.nextRefreshMs as number;
      await live.touch(sessionId, nextRefreshMs);
      sendDelta(res, await liveTabDelta({ db, cache }, pids, parseClientVersions(req.body)));
    })
  );

  router.post(
    "/api/live/:pid",
    requireSession,
    ...dynamic("refresh"),
    wrap(async (req, res) => {
      if (!holdsPermission(callerOf(res), "View Polls", config)) {
        res.status(403).json({ error: NO_VIEW_PERMISSION, code: "no-view-permission" });
        return;
      }
      const added = await live.addPoll(liveSession(res), String(req.params.pid ?? ""));
      if ("refused" in added) {
        res.status(added.refused.status).json({ error: added.refused.error, ...(added.refused.limit ? { limit: added.refused.limit } : {}) });
        return;
      }
      res.json({ polls: added.polls, nextRefreshMs: res.locals.nextRefreshMs });
    })
  );

  router.delete(
    "/api/live/:pid",
    requireSession,
    ...dynamic("refresh"),
    wrap(async (req, res) => {
      const polls = await live.removePoll(sessionIdOf(res), String(req.params.pid ?? ""));
      res.json({ polls, nextRefreshMs: res.locals.nextRefreshMs });
    })
  );

  // ---- The signed-in overlay for polls the visitor already holds ----

  router.get(
    "/api/me/polls",
    requireSession,
    ...dynamic("refresh"),
    wrap(async (req, res) => {
      const raw = typeof req.query.pids === "string" ? req.query.pids : "";
      const pids = [...new Set(raw.split(",").map((p) => p.trim()).filter(Boolean))].slice(0, config.maxPollsSearchResults);
      const [mine, rows] = await Promise.all([
        overlay(db, emailOf(res), pids),
        pids.length === 0 ? [] : db.selectFrom("polls").select([...ACCESS_COLUMNS]).where("id", "in", pids).execute()
      ]);
      const watchable = await mayWatchMany({ db, config }, callerOf(res), rows);
      for (const pid of Object.keys(mine)) mine[pid] = { ...mine[pid]!, mayWatch: watchable.has(pid) };
      res.json({ overlay: mine, nextRefreshMs: res.locals.nextRefreshMs });
    })
  );

  // ---- One poll a link opened, for the card to mount ----

  router.get(
    "/api/me/polls/:pid",
    requireSession,
    pageLoads,
    wrap(async (req, res) => {
      const pid = parsePid(req.params.pid);
      const decision = pid ? await decideSharedLink({ db, config }, callerOf(res), pid) : null;
      if (!pid || !decision || decision.landing.open !== pid) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const row = await db.selectFrom("polls").selectAll().where("id", "=", pid).executeTakeFirstOrThrow();
      await refreshProjection(cache, row);
      const email = emailOf(res);
      const [counts, mine, blocks] = await Promise.all([
        readOrRebuildCounts({ db, cache }, [pid]),
        overlay(db, email, [pid]),
        voteBlocks(callerOf(res), email, userIdOf(res), [row])
      ]);
      const entry: OverlayEntry = mine[pid] ?? { voted: false, bookmarked: false };
      const watchable = await mayWatchMany({ db, config }, callerOf(res), [row]);
      res.json({
        poll: projectPoll(row),
        counts: counts.get(pid) ?? { voteCount: 0, choiceCounts: {}, countsVersion: 0 },
        overlay: { ...entry, mayWatch: watchable.has(pid), voteBlockedReason: blocks.get(pid) ?? null }
      });
    })
  );

  return router;
}
