/**
 * /api/polls* and /api/admin/polls* endpoints (contracts/api-endpoints.md).
 * Kept apart from `001-user-auth`'s `api.ts` (auth/profile) — separate
 * domain, separate file (plan.md Structure Decision).
 */
import { Router, type Request, type RequestHandler, type Response } from "express";
import type { AppConfig } from "../config.js";
import type { SessionCache } from "../auth/sessionCache.js";
import type { Cache } from "../cache/cache.js";
import type { AppContext } from "../server.js";
import { assertMayAddChoice, castVote } from "../votes/votePath.js";
import { keyedDeviceHashes } from "../votes/deviceEvents.js";
import { randomUUID } from "node:crypto";
import { localScreener, screenWithTimeout } from "../polls/screening.js";
import { projectPoll } from "../polls/versions.js";
import { renderNotesHtml, renderNotesPreview } from "../polls/notes.js";
import { adminSearch, AdminSearchError, parseAdminSearch } from "../search/adminSearch.js";
import { mayViewResults, mayWatch } from "../polls/access.js";
import { addBookmark, BookmarkCapError, removeBookmark } from "../polls/bookmarks.js";
import {
  countTitleCollisions,
  deletePoll,
  findPoll,
  insertPoll,
  listAdminRows,
  pollCreatorId,
  creatorEmails,
  adderNames,
  withAdderNames,
  appendChoice,
  pollsEverVoted,
  voteTotals,
  titlesLike,
  updatePoll,
  type Db,
  type Choice,
  type Poll,
  DELETABLE_STATES,
  isInvitationOnly
} from "../polls/store.js";
import type { PollRow } from "../db/schema.js";
import {
  createRequireAdmin,
  createRequirePollOwner,
  canReachAdmin,
  holdsPermission,
  isAdminEmail,
  NO_VIEW_PERMISSION,
  NO_VOTE_PERMISSION,
  createDefaultPoll,
  computeResults,
  validatePollFields,
  validateStateAction,
  applyChoiceColors,
  replaceChoices,
  mergeChoices,
  withChoicesAddedSince,
  duplicatePoll,
  nextAvailableCopyTitle,
  VoteError,
  AdminError,
  ChoiceError,
  assertAddableState,
  validateAddedChoice,
  normalizedChoiceKey,
  duplicateChoiceError,
  choicesFullError,
  exportPollData,
  exportPollMarkdown,
  editModeFor,
  capabilitiesFor,
  hasEverBeenVotedOn,
  isAllDefaults,
  validateFieldLength,
  TITLE_MAX
} from "../polls/service.js";
import { rebuildIfMissing } from "../polls/counters.js";
import {
  acceptedCounts,
  addInvitees,
  isClosedState,
  listInvitees,
  removeInvitees,
  resendInvitation,
  storeTimeZone
} from "../invitations/invitations.js";
import { sendPendingInvitations, sendReminder } from "../invitations/sender.js";

const NOT_INVITATION_ONLY = "This poll is not Invitation Only.";


/** Publishing ends any editing session, so every session field is cleared. */
const CLEAR_SESSION = {
  pollStateBeforeEditUpdate: null,
  pollEditUpdateHeartbeatTimestamp: null,
  pollEditUpdateClientGUID: null
} as const;

export interface PollsApiDeps {
  db: Db;
  cache: Cache;
  config: AppConfig;
  sessions: SessionCache;
}

/** Route async errors into the central error handler. */
const wrap =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

/** Logged-in caller's emailAddress, or null for a guest (data-model.md participant key). */
async function callerEmail(
  sessions: SessionCache,
  req: Request
): Promise<{ id: string; sessionId: string; email: string; userName: string; permissions: string[] } | null> {
  const session = await sessions.getSession(req);
  const user = session?.user as { id: string; email?: string; userName?: string; permissions?: string[] } | undefined;
  if (!session || !user?.email) return null;
  return {
    id: user.id,
    sessionId: session.session.id,
    email: user.email.toLowerCase(),
    userName: user.userName ?? "",
    permissions: user.permissions ?? []
  };
}

const pidOf = (req: Request): string => String(req.params.pid ?? "");

/** The vote and bookmark routes: dynamic requests, mounted with the other dynamic routes. */
export function createVoteRouter(context: AppContext): Router {
  const { db, cache, config, sessions, shedding, floors, budget, rosters, abuse } = context;
  const router = Router();

  const bookmark = (bookmarked: boolean): RequestHandler =>
    wrap(async (req, res) => {
      const caller = await callerEmail(sessions, req);
      if (!caller) {
        res.status(401).json({ error: "Not logged in" });
        return;
      }
      if (bookmarked && !holdsPermission(caller, "View Polls", config)) {
        res.status(403).json({ error: NO_VIEW_PERMISSION, code: "no-view-permission" });
        return;
      }
      await budget.countRequest("refresh");
      try {
        if (bookmarked && !(await mayWatch({ db, config }, caller, pidOf(req)))) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        if (bookmarked) await addBookmark({ db, cache }, caller.email, pidOf(req), config.maxBookmarksPerUser);
        else await removeBookmark({ db, cache }, caller.email, pidOf(req));
      } catch (err) {
        if (err instanceof BookmarkCapError) {
          // FIX027: the limit rides with the refusal so the dialog can name it.
          res.status(409).json({ error: "bookmark-cap", limit: config.maxBookmarksPerUser, nextRefreshMs: res.locals.nextRefreshMs });
          return;
        }
        if (err instanceof Error && "code" in err && (err as { code: unknown }).code === "23503") {
          res.status(404).json({ error: "Not found" });
          return;
        }
        throw err;
      }
      res.json({ bookmarked, nextRefreshMs: res.locals.nextRefreshMs });
    });
  router.post("/api/polls/:pid/bookmark", shedding.withKind("refresh"), floors.enforceFloor("refresh"), bookmark(true));
  router.delete("/api/polls/:pid/bookmark", shedding.withKind("refresh"), floors.enforceFloor("refresh"), bookmark(false));

  router.post(
    "/api/polls/:pid/vote",
    shedding.withKind("vote"),
    floors.enforceFloor("vote"),
    wrap(async (req, res) => {
      const caller = await callerEmail(sessions, req);
      if (!caller) {
        res.status(401).json({ error: "Log in to vote" });
        return;
      }
      if (!holdsPermission(caller, "Vote on Polls", config)) {
        res.status(403).json({ error: NO_VOTE_PERMISSION, code: "no-vote-permission" });
        return;
      }
      await budget.countRequest("vote");
      const choiceIds = Array.isArray(req.body?.choiceIds)
        ? req.body.choiceIds.filter((c: unknown): c is string => typeof c === "string")
        : [];
      const device = config.deviceEvents.enabled
        ? { device: { accountId: caller.id, ...keyedDeviceHashes(req.get("x-device-fingerprint"), config.deviceEvents.key) } }
        : {};
      try {
        const outcome = await castVote(
          { db, cache, config, rosters, abuse },
          { sessionId: caller.sessionId, userId: caller.id, email: caller.email, userName: caller.userName, ip: req.ip ?? "", pid: pidOf(req), choiceIds, ...device }
        );
        res.json({ ...outcome, nextRefreshMs: config.floors.vote });
      } catch (err) {
        if (err instanceof VoteError) {
          res.status(err.status).json({ error: err.message, ...(err.code ? { code: err.code } : {}) });
          return;
        }
        throw err;
      }
    })
  );

  router.post(
    "/api/polls/:pid/choices",
    shedding.withKind("vote"),
    floors.enforceFloor("vote", "choice"),
    wrap(async (req, res) => {
      const pid = pidOf(req);
      const refuse = (status: number, error: string, code?: string) => {
        console.log(`[choices] Refused choice for poll ${pid}: ${code ?? status}`);
        res.status(status).json({ error, ...(code ? { code } : {}) });
      };
      const caller = await callerEmail(sessions, req);
      if (!caller) {
        refuse(401, "Log in to add a choice");
        return;
      }
      if (!holdsPermission(caller, "Vote on Polls", config)) {
        refuse(403, NO_VOTE_PERMISSION, "no-vote-permission");
        return;
      }
      if (!holdsPermission(caller, "View Polls", config) || !(await mayViewResults({ db, config }, caller, pid))) {
        refuse(404, "Not found");
        return;
      }
      await budget.countRequest("vote");
      const row = await db.selectFrom("polls").selectAll().where("id", "=", pid).executeTakeFirst();
      if (!row) {
        refuse(404, "Not found");
        return;
      }
      try {
        assertAddableState({ pollState: row.poll_state, hasPendingUpdate: row.pending_update !== null });
        await assertMayAddChoice(
          { db, cache, config, rosters, abuse },
          {
            pid,
            pollVisibility: row.poll_visibility,
            pollSharingMode: row.poll_sharing_mode,
            voteMutability: row.vote_mutability,
            votersAddChoices: row.voters_add_choices,
            createdById: row.created_by_id
          },
          { sessionId: caller.sessionId, userId: caller.id, email: caller.email }
        );
        const label = validateAddedChoice(row, req.body?.label, config);
        let verdict: string;
        try {
          verdict = await screenWithTimeout(localScreener, { title: "", subtitle: "", notes: "", choiceLabels: [label] }, config.screeningCallTimeoutMs);
        } catch (err) {
          console.log(`[choices] Screening failed for poll ${pid}: ${err instanceof Error ? err.message : String(err)}`);
          throw new ChoiceError(503, "Couldn't check this choice. Try again.", "SCREENING_UNAVAILABLE");
        }
        if (verdict !== "") throw new ChoiceError(422, "This choice uses language that isn't allowed.", "UNACCEPTABLE_LANGUAGE");
        const saved = await appendChoice({ db, cache }, pid, (locked) => {
          assertAddableState({ pollState: locked.poll_state, hasPendingUpdate: locked.pending_update !== null });
          const key = normalizedChoiceKey(label);
          if (locked.choices.some((c) => normalizedChoiceKey(c.label) === key)) throw duplicateChoiceError();
          if (locked.choices.length >= config.maxChoices) throw choicesFullError(config.maxChoices);
          return {
            id: randomUUID(),
            label,
            position: Math.max(-1, ...locked.choices.map((c) => c.position)) + 1,
            ...(locked.vote_anonymity === "No" ? { addedBy: caller.id } : {})
          };
        });
        if (!saved) {
          refuse(404, "Not found");
          return;
        }
        const projection = projectPoll(saved);
        console.log(`[choices] Added choice to poll ${pid} (${projection.choices.length} choices)`);
        res.json({ choices: projection.choices, contentVersion: projection.contentVersion });
      } catch (err) {
        if (err instanceof ChoiceError || err instanceof VoteError) {
          refuse(err.status, err.message, err.code);
          return;
        }
        throw err;
      }
    })
  );
  return router;
}

export function createPollsApiRouter({ db, cache, config, sessions }: PollsApiDeps): Router {
  const router = Router();
  const store = { db, cache };
  const requireAdmin = createRequireAdmin({ sessions, config });
  const requireCreator = createRequireAdmin({ sessions, config, allow: (user) => canReachAdmin(user, config) });
  const requireOwnPoll = [requireCreator, createRequirePollOwner({ sessions, config, db, pidOf })];

  /** The admin card sends the creator's zone on every write; it is stored apart from the write itself (A5). */
  const takeTimeZone: RequestHandler = (req, _res, next) => {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body || body.timeZone === undefined) {
      next();
      return;
    }
    const value = body.timeZone;
    delete body.timeZone;
    storeTimeZone(db, pidOf(req), value).then(() => next(), next);
  };

  function sendInBackground(pid: string): void {
    sendPendingInvitations({ db, config }, pid).catch((err) =>
      console.error(`[invitations] Sending for poll ${pid} failed:`, err)
    );
  }

  // ---- Admin routes (requireAdmin, contracts/api-endpoints.md "Admin") ----

  /**
   * A roster longer than the ceiling is replaced by an empty array rather than
   * truncated. See specs/014-poll-edit-card/contracts/api-endpoints.md.
   */
  function withinDisplayLimit<T>(list: T[]): T[] {
    return list.length > config.maxPrivatePollVoters ? [] : list;
  }

  function buildAdminPollDetail(poll: Poll) {
    const { currentVotes: _currentVotes, _id, ...rest } = poll;
    return {
      pid: _id,
      ...rest,
      notesHtml: renderNotesHtml(rest.notes),
      invitedVoterList: withinDisplayLimit(rest.invitedVoterList),
      bannedVoterList: withinDisplayLimit(rest.bannedVoterList)
    };
  }

  // The reads of one poll name the voters who added its choices, as the list does.
  async function namedAdminPollDetail(poll: Poll) {
    const detail = buildAdminPollDetail(poll);
    return { ...detail, choices: withAdderNames(detail.choices, await adderNames(db, [detail.choices])) };
  }

  // 011 T020 (US1): begin an editing or updating session. The server decides the
  // mode from the vote history — the client does not ask for one — and re-checks
  // every eligibility condition here rather than trusting the page's own check
  // (FR-019). A refusal makes no change to the poll.
  router.post(
    "/api/admin/polls/:pid/edit-session",
    requireOwnPoll,
    wrap(async (req, res) => {
      const poll = await findPoll(db, pidOf(req));
      if (!poll) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const clientGuid = typeof req.body?.clientGuid === "string" ? req.body.clientGuid : "";
      if (!clientGuid) {
        res.status(400).json({ error: "clientGuid is required." });
        return;
      }
      const hasEverVoted = await hasEverBeenVotedOn(db, poll._id);
      const decision = editModeFor(poll, hasEverVoted);
      if ("refusal" in decision) {
        res.status(409).json({
          granted: false,
          reason: decision.refusal,
          message: decision.message
        });
        return;
      }

      // FR-017/FR-018: take the lock in one atomic write, filtered on the state
      // we decided from. If another tab claimed it in between, the filter misses
      // and we refuse rather than overwrite their session.
      const now = new Date();
      const claimed = await updatePoll(
        store,
        poll._id,
        {
          pollStateBeforeEditUpdate: poll.pollState,
          pollState: "EDITING",
          pollEditUpdateHeartbeatTimestamp: now,
          pollEditUpdateClientGUID: clientGuid
        },
        { pollState: poll.pollState }
      );
      if (!claimed) {
        res.status(409).json({
          granted: false,
          reason: "LOCKED",
          message: "This poll is currently being edited. Please try again shortly."
        });
        return;
      }
      // The per-choice counts at the moment the session is taken: the deletion
      // confirmation names these for the whole session, never a fresher number.
      const live = await rebuildIfMissing({ db, cache }, claimed._id);
      const choiceCounts = Object.fromEntries(
        claimed.choices.map((c) => [c.id, live?.choiceCounts[c.id] ?? 0])
      );
      res.json({ granted: true, mode: decision.mode, poll: await namedAdminPollDetail(claimed), choiceCounts });
    })
  );

  // 011 T061 (US5): the editing page signals it is still present. Filtered on
  // both the identifier and the state, so a client whose lock was recovered
  // learns it no longer holds one instead of silently refreshing someone else's.
  router.post(
    "/api/admin/polls/:pid/edit-session/heartbeat",
    requireOwnPoll,
    wrap(async (req, res) => {
      const clientGuid = typeof req.body?.clientGuid === "string" ? req.body.clientGuid : "";
      const beat = await updatePoll(
        store,
        pidOf(req),
        { pollEditUpdateHeartbeatTimestamp: new Date() },
        { pollState: "EDITING", pollEditUpdateClientGUID: clientGuid }
      );
      if (!beat) {
        res.status(409).json({ alive: false });
        return;
      }
      res.json({ alive: true });
    })
  );

  // 011 T062 (US5): end a session cleanly, restoring the stashed state. Only the
  // holder may release it (FR-023) — the identifier is part of the filter, so a
  // stale client cannot clear a lock another admin has since taken.
  router.delete(
    "/api/admin/polls/:pid/edit-session",
    requireOwnPoll,
    wrap(async (req, res) => {
      const clientGuid = typeof req.body?.clientGuid === "string" ? req.body.clientGuid : "";
      const poll = await findPoll(db, pidOf(req));
      if (!poll || poll.pollState !== "EDITING" || poll.pollEditUpdateClientGUID !== clientGuid) {
        res.status(409).json({ released: false });
        return;
      }
      const restored = poll.pollStateBeforeEditUpdate ?? "INITIALIZED";
      await updatePoll(
        store,
        poll._id,
        { pollState: restored, ...CLEAR_SESSION },
        { pollEditUpdateClientGUID: clientGuid }
      );
      res.json({ released: true, pollState: restored });
    })
  );

  router.post(
    "/api/admin/polls/:pid/colors",
    requireOwnPoll,
    takeTimeZone,
    wrap(async (req, res) => {
      const poll = await findPoll(db, pidOf(req));
      if (!poll) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (await refusesLineGraphSetting(req, res, poll._id)) return;
      const clientGuid = typeof req.body?.clientGuid === "string" ? req.body.clientGuid : "";
      if (poll.pollState !== "EDITING" || clientGuid === "" || poll.pollEditUpdateClientGUID !== clientGuid) {
        console.log(`[admin] Refused colors for poll ${poll._id}: no edit session held`);
        res.status(409).json({ error: "Colors can only be saved from the open edit session." });
        return;
      }
      if (!(await hasEverBeenVotedOn(db, poll._id))) {
        console.log(`[admin] Refused colors for poll ${poll._id}: no votes`);
        res.status(409).json({ error: "Colors are saved on their own only for a poll that has votes." });
        return;
      }
      let choices: Choice[];
      let lineGraph: Partial<Poll>;
      try {
        const setsOnlyLineGraph = req.body?.colors === undefined && req.body?.lineGraphEnabled !== undefined;
        choices = setsOnlyLineGraph ? poll.choices : applyChoiceColors(poll, req.body?.colors);
        lineGraph = validatePollFields(poll, { lineGraphEnabled: req.body?.lineGraphEnabled }, true);
      } catch (err) {
        if (err instanceof AdminError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }
      const restored = poll.pollStateBeforeEditUpdate ?? "INITIALIZED";
      const saved = await updatePoll(
        store,
        poll._id,
        { choices, pollState: restored, ...CLEAR_SESSION, ...lineGraph },
        { pollEditUpdateClientGUID: clientGuid }
      );
      if (!saved) {
        console.log(`[admin] Refused colors for poll ${poll._id}: the session ended`);
        res.status(409).json({ error: "Colors can only be saved from the open edit session." });
        return;
      }
      console.log(`[admin] Saved colors of poll ${poll._id}`);
      res.json({ pollState: restored, choices });
    })
  );

  /**
   * 011: both the choices save and the publish arrive from an open editing
   * session, so the poll is EDITING by the time they get here. Eligibility must
   * therefore be judged against the state the session stashed — and only for the
   * client that actually holds the lock, so a stale tab cannot write over a
   * session someone else now owns (FR-023).
   */
  /** A line graph setting from anyone but an Administrator is refused before anything is written. */
  async function refusesLineGraphSetting(req: Request, res: Response, pid: string): Promise<boolean> {
    if (req.body?.lineGraphEnabled === undefined) return false;
    const caller = await callerEmail(sessions, req);
    if (caller && isAdminEmail(caller.email, config)) return false;
    console.log(`[admin] Refused line graph setting for poll ${pid}: not an Administrator`);
    res.status(403).json({ error: "Only an Administrator can change the line graph." });
    return true;
  }

  function resolveEditContext(poll: Poll, clientGuid: string, hasEverVoted: boolean) {
    const holdsLock =
      poll.pollState === "EDITING" && clientGuid !== "" && poll.pollEditUpdateClientGUID === clientGuid;
    if (poll.pollState === "EDITING" && !holdsLock) {
      return { refused: "This poll is currently being edited. Please try again shortly." };
    }
    const effective = holdsLock
      ? { ...poll, pollState: poll.pollStateBeforeEditUpdate ?? ("INITIALIZED" as const) }
      : poll;
    const decision = editModeFor(effective, hasEverVoted);
    if ("refusal" in decision) return { refused: decision.message };
    return { mode: decision.mode, holdsLock };
  }

  // 011 T092 (US9, FR-053): destroy a poll outright. Offered only for the three
  // states that can never have a live vote behind them — a poll that has been
  // voted on and is not archived can never be deleted (SC-012).
  router.delete(
    "/api/admin/polls/:pid",
    requireOwnPoll,
    wrap(async (req, res) => {
      const poll = await findPoll(db, pidOf(req));
      if (!poll) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (!(DELETABLE_STATES as readonly string[]).includes(poll.pollState)) {
        res.status(409).json({
          error: `A poll in the ${poll.pollState} state cannot be deleted.`
        });
        return;
      }
      // The append-only history goes with the poll it belonged to — there is no
      // poll left for it to be the audit trail of.
      await deletePoll({ db, cache }, poll._id);
      res.status(204).send();
    })
  );


  // 011 T081 (US7, FR-040): the admin's escape hatch. Offered only once the
  // budget is exhausted — the sweep retries on its own until then, so a button
  // before that point would just race it.
  router.post(
    "/api/admin/polls/:pid/rescreen",
    requireAdmin,
    wrap(async (req, res) => {
      const poll = await findPoll(db, pidOf(req));
      if (!poll) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (
        poll.pollState !== "REJECTED" ||
        poll.pollAcceptabilityScreeningAttempts < config.maxAcceptabilityScreeningAttempts
      ) {
        res.status(409).json({
          error: "Re-screening is only offered for a poll whose screening attempts are exhausted."
        });
        return;
      }
      await updatePoll(store, poll._id, {
        pollState: "AWAITING APPROVAL",
        pollRejectionReason: null,
        pollApprovalTimestamp: null,
        pollAcceptabilityScreeningAttempts: 0,
        ...CLEAR_SESSION
      });
      res.json({ pollState: "AWAITING APPROVAL" });
    })
  );

  // 011 T036/T037 (US3): publish. Saves the submitted fields and requests
  // approval, then returns — the outcome arrives later from the approval sweep
  // (FR-026). A poll still holding its starter choices is held back instead.
  router.post(
    "/api/admin/polls/:pid/publish",
    requireOwnPoll,
    takeTimeZone,
    wrap(async (req, res) => {
      const poll = await findPoll(db, pidOf(req));
      if (!poll) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (await refusesLineGraphSetting(req, res, poll._id)) return;
      // One update is reviewed at a time: a further save would have nothing
      // truthful to answer about the first one's fate (FR-005).
      if (poll.pendingUpdate) {
        res.status(409).json({
          error: "Changes are already being reviewed. Try again shortly.",
          code: "PENDING_REVIEW"
        });
        return;
      }
      const hasEverVoted = await hasEverBeenVotedOn(db, poll._id);
      const clientGuid = typeof req.body?.clientGuid === "string" ? req.body.clientGuid : "";
      const decision = resolveEditContext(poll, clientGuid, hasEverVoted);
      if (decision.refused) {
        res.status(409).json({ error: decision.refused });
        return;
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      delete body.clientGuid;
      const baseChoiceIds = body.baseChoiceIds;
      delete body.baseChoiceIds;
      // FR-009 (011): the reduced surface may change only these four. 012 folds the
      // choice list into this same call, so `labels` joins the disallowed set here
      // rather than being refused by a route of its own (FR-014).
      // 012 FR-059/FR-064: the participant lists and the voter count limit join the
      // four fields the update surface may change.
      //
      // Moderating a poll that already has votes is the main reason the participant
      // section exists. The voter limit is admitted on a related but distinct
      // argument: unlike choice mode, vote mutability and visibility, it changes the
      // poll's *capacity* rather than the meaning of any vote already cast — raising
      // it invalidates nothing — and a poll filling up is exactly when an
      // administrator needs to raise it.
      const UPDATE_FIELDS = [
        "title", "subtitle", "notes", "startAt", "endAt",
        "invitedVoterList", "bannedVoterList", "voterCountLimit", "colors", "lineGraphEnabled",
        "labels", "pollSharingMode", "choiceMode", "voteMutability", "votersAddChoices"
      ];
      // The frozen trio passes this gate so `validatePollFields` can refuse each
      // with its own 409 naming the field; everything else still gets the 400.
      const FROZEN_FIELDS = ["pollVisibility", "voteAnonymity", "keywords"];
      if (decision.mode === "UPDATE") {
        const disallowed = Object.keys(body).filter((k) => !UPDATE_FIELDS.includes(k) && !FROZEN_FIELDS.includes(k));
        if (disallowed.length > 0) {
          res.status(400).json({
            error: `This poll has votes; only ${UPDATE_FIELDS.join(", ")} may be changed.`
          });
          return;
        }
      }

      // 012 T049 (FR-011/FR-013): the choice list is validated and applied in the
      // same pass as everything else, and lands in the same $set. Two routes meant a
      // rejected publish could leave choices already persisted — a partial save the
      // administrator had no way to see. One write makes that unreachable.
      const { labels, colors } =
        body.labels !== undefined
          ? withChoicesAddedSince(poll, body.labels, body.colors, baseChoiceIds)
          : { labels: undefined, colors: body.colors };
      delete body.labels;
      delete body.colors;

      let $set: Partial<Poll>;
      // An ever-voted poll's choices change by id, so votes stay attached to the
      // labels that survive; the merged list waits in pending_update (R3).
      let mergedChoices: Choice[] | null = null;
      try {
        $set = validatePollFields(poll, body, hasEverVoted, new Date(), config);
        const current = $set.choices ? { ...poll, choices: $set.choices } : poll;
        if (decision.mode === "UPDATE" && labels !== undefined) {
          mergedChoices = mergeChoices(current, labels, config, colors).choices;
        } else if (labels !== undefined) {
          $set.choices = replaceChoices(current, labels, config, colors);
          $set.currentVotes = poll.currentVotes;
        } else if (colors !== undefined) {
          $set.choices = applyChoiceColors(current, colors);
        }
      } catch (err) {
        if (err instanceof AdminError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }

      // FR-024/FR-025: a poll that has not been published yet is held back, not
      // published, while it still has its starter choices; any edits still save.
      // A published poll has been screened already, so it is sent for review as usual.
      const effectiveState = decision.holdsLock
        ? (poll.pollStateBeforeEditUpdate ?? "INITIALIZED")
        : poll.pollState;
      const merged = { ...poll, ...$set };
      if (effectiveState === "INITIALIZED" && isAllDefaults(merged)) {
        await updatePoll(store, poll._id, { ...$set, pollState: "INITIALIZED", ...CLEAR_SESSION });
        res.json({
          ...await namedAdminPollDetail({ ...poll, ...$set, pollState: "INITIALIZED" }),
          message: "This poll still has its default values and cannot be published."
        });
        return;
      }

      // An ever-voted, already published poll never goes back through
      // AWAITING APPROVAL: the non-text fields apply now, with no state change,
      // and a changed title, subtitle or notes waits in `pending_update` for the
      // approval sweep. The poll keeps serving its pre-save content meanwhile.
      if (decision.mode === "UPDATE" && effectiveState !== "INITIALIZED") {
        const pending: { title?: string; subtitle?: string; notes?: string; choices?: Choice[] } = {};
        if ($set.title !== undefined) {
          if ($set.title !== poll.title) pending.title = $set.title;
          delete $set.title;
        }
        if ($set.subtitle !== undefined) {
          if ($set.subtitle !== poll.subtitle) pending.subtitle = $set.subtitle;
          delete $set.subtitle;
        }
        if ($set.notes !== undefined) {
          if ($set.notes !== poll.notes) pending.notes = $set.notes;
          delete $set.notes;
        }
        if (mergedChoices) {
          const byPosition = (list: Choice[]) => [...list].sort((a, b) => a.position - b.position);
          if (JSON.stringify(byPosition(mergedChoices)) !== JSON.stringify(byPosition(poll.choices))) {
            pending.choices = mergedChoices;
          }
        }
        // The validator re-asserts a public poll's null limit on every pass; writing
        // it back unchanged would bump content_version for a save that changed
        // nothing a voter sees.
        if ($set.voterCountLimit !== undefined && $set.voterCountLimit === poll.voterCountLimit) {
          delete $set.voterCountLimit;
        }
        const hasPending = Object.keys(pending).length > 0;
        const sessionRelease = decision.holdsLock
          ? { pollState: poll.pollStateBeforeEditUpdate ?? ("INITIALIZED" as const), ...CLEAR_SESSION }
          : {};
        const saved = await updatePoll(
          store,
          poll._id,
          {
            ...$set,
            ...(hasPending ? { pendingUpdate: pending } : {}),
            pendingRejectionReason: null,
            ...sessionRelease
          },
          decision.holdsLock ? { pollEditUpdateClientGUID: clientGuid } : {}
        );
        if (!saved) {
          res.status(409).json({ error: "This poll is currently being edited. Please try again shortly." });
          return;
        }
        console.log(
          hasPending
            ? `[admin] Saved poll ${poll._id}; title/subtitle/notes changes sent for review`
            : `[admin] Saved poll ${poll._id} with no change needing review`
        );
        res.json({ ...await namedAdminPollDetail(saved), pending: hasPending });
        return;
      }

      await updatePoll(store, poll._id, {
        ...$set,
        pollState: "AWAITING APPROVAL",
        pollRejectionReason: null,
        pollApprovalTimestamp: null,
        pollAcceptabilityScreeningAttempts: 0,
        ...CLEAR_SESSION
      });
      res.json(
        await namedAdminPollDetail({
          ...poll,
          ...$set,
          pollState: "AWAITING APPROVAL",
          pollRejectionReason: null,
          pollApprovalTimestamp: null,
          pollAcceptabilityScreeningAttempts: 0
        })
      );
    })
  );

  // A new poll's Save: stores the answers so far and leaves the poll unpublished,
  // to be finished later. Publish's validators apply, except that a draft may
  // have an empty title (the stored one stays) and fewer choices than publishing
  // needs (none keeps the stored ones).
  router.post(
    "/api/admin/polls/:pid/save",
    requireOwnPoll,
    takeTimeZone,
    wrap(async (req, res) => {
      const poll = await findPoll(db, pidOf(req));
      if (!poll) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (await refusesLineGraphSetting(req, res, poll._id)) return;
      const hasEverVoted = await hasEverBeenVotedOn(db, poll._id);
      const clientGuid = typeof req.body?.clientGuid === "string" ? req.body.clientGuid : "";
      const decision = resolveEditContext(poll, clientGuid, hasEverVoted);
      if (decision.refused) {
        res.status(409).json({ error: decision.refused });
        return;
      }
      const effectiveState = decision.holdsLock ? poll.pollStateBeforeEditUpdate : poll.pollState;
      if (effectiveState !== "INITIALIZED") {
        res.status(409).json({ error: "Only a poll that has not been published can be saved without publishing." });
        return;
      }

      const body = { ...((req.body ?? {}) as Record<string, unknown>) };
      delete body.clientGuid;
      if (typeof body.title === "string" && body.title.trim() === "") delete body.title;
      const { labels, colors } =
        body.labels !== undefined
          ? withChoicesAddedSince(poll, body.labels, body.colors, body.baseChoiceIds)
          : { labels: undefined, colors: body.colors };
      delete body.labels;
      delete body.colors;
      delete body.baseChoiceIds;
      const hasLabels = Array.isArray(labels) && labels.some((l) => typeof l === "string" && l.trim() !== "");

      let $set: Partial<Poll>;
      try {
        $set = validatePollFields(poll, body, hasEverVoted, new Date(), config);
        if (hasLabels) {
          $set.choices = replaceChoices($set.choices ? { ...poll, choices: $set.choices } : poll, labels, { ...config, minChoices: 1 }, colors);
          $set.currentVotes = poll.currentVotes;
        }
      } catch (err) {
        if (err instanceof AdminError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }

      await updatePoll(store, poll._id, { ...$set, pollState: "INITIALIZED", ...CLEAR_SESSION });
      console.log(`[admin] Saved poll ${poll._id} without publishing`);
      res.json({
        ...await namedAdminPollDetail({ ...poll, ...$set, pollState: "INITIALIZED", ...CLEAR_SESSION }),
        message: "Saved: you can finish later."
      });
    })
  );

  router.post(
    "/api/admin/polls",
    requireCreator,
    wrap(async (req, res) => {
      const poll = createDefaultPoll();
      const caller = await callerEmail(sessions, req);
      await insertPoll(store, poll, caller ? { id: caller.id, name: caller.userName, email: caller.email } : undefined);
      res.status(201).json({ pid: poll._id });
    })
  );

  router.get(
    "/api/admin/polls",
    requireCreator,
    wrap(async (req, res) => {
      const caller = await callerEmail(sessions, req);
      const ownerFilter = caller && !isAdminEmail(caller.email, config) ? caller.id : undefined;
      const { rows, truncated } = await listAdminRows(db, config.maxPollsAdminSearchResults, ownerFilter);
      // One query for the whole page rather than one per row: which polls have
      // ever been voted on decides both editing surfaces and deletability.
      const votedPids = await pollsEverVoted(db, rows.map((p) => p.id));
      const emails = await creatorEmails(db, rows);
      const names = await adderNames(db, rows.map((p) => p.choices));
      const accepted = await acceptedCounts(db, rows.map((p) => p.id));
      const totals = await voteTotals(db, rows.filter((p) => p.choice_mode === "Multiple-Choice Poll").map((p) => p.id));
      const polls = rows.map((p) => adminListRow(p, votedPids.has(p.id), emails.get(p.created_by_id) ?? "", accepted, totals, names, caller?.id));
      // Re-attempt Screening stays with administrators; a creator republishes instead.
      res.json({ polls: ownerFilter ? polls.map((p) => ({ ...p, canRescreen: false })) : polls, truncated });
    })
  );

  function notesPreviewFields(notes: string) {
    const preview = renderNotesPreview(notes);
    return { notesPreviewHtml: preview.html, hasMoreNotes: preview.hasMore };
  }

  function adminListRow(p: PollRow, hasEverBeenVotedOn: boolean, createdByEmail: string, accepted: Map<string, number>, totals: Map<string, number>, names: Map<string, string>, callerId?: string) {
    const forRules = {
      pollState: p.poll_state as Poll["pollState"],
      pollAcceptabilityScreeningAttempts: p.poll_acceptability_screening_attempts,
      pendingUpdate: (p.pending_update as Poll["pendingUpdate"]) ?? null
    };
    return {
      pid: p.id,
      title: p.title,
      subtitle: p.subtitle,
      ...notesPreviewFields(p.notes),
      keywords: p.keywords,
      pollState: p.poll_state,
      pollStateBeforeEditUpdate: p.poll_state_before_edit_update,
      createdAt: p.created_at,
      createdByName: p.created_by_name,
      createdByEmail,
      ownPoll: callerId !== undefined && p.created_by_id === callerId,
      launchedAt: p.launched_at,
      startAt: p.start_at,
      endAt: p.end_at,
      pollRejectionReason: p.poll_rejection_reason,
      pendingUpdate: p.pending_update !== null,
      pendingRejectionReason: p.pending_rejection_reason,
      lineGraphEnabled: p.line_graph_enabled,
      votersAddChoices: p.voters_add_choices,
      pollApprovalTimestamp: p.poll_approval_timestamp,
      pollAcceptabilityScreeningAttempts: p.poll_acceptability_screening_attempts,
      hasEverBeenVotedOn,
      pollVisibility: p.poll_visibility,
      pollSharingMode: p.poll_sharing_mode,
      voteAnonymity: p.vote_anonymity,
      choices: withAdderNames([...p.choices].sort((a, b) => a.position - b.position), names),
      choiceMode: p.choice_mode,
      voteMutability: p.vote_mutability,
      voterCountLimit: p.voter_count_limit,
      voteCount: p.vote_count,
      // Multiple-choice only: votes cast across all choices, more than the voter count.
      ...(p.choice_mode === "Multiple-Choice Poll" ? { voteTotal: totals.get(p.id) ?? 0 } : {}),
      invitationCount: p.invited_count,
      acceptedCount: isInvitationOnly({ pollVisibility: p.poll_visibility as Poll["pollVisibility"], pollSharingMode: p.poll_sharing_mode as Poll["pollSharingMode"] })
        ? accepted.get(p.id) ?? 0
        : 0,
      bannedVoterCount: p.banned_count,
      // 012 FR-030: every action rule comes from one shared predicate.
      ...capabilitiesFor(forRules, hasEverBeenVotedOn, config.maxAcceptabilityScreeningAttempts)
    };
  }

  // The structured search: one statement, every control ANDed, newest first.
  router.get(
    "/api/admin/polls/search",
    requireAdmin,
    wrap(async (req, res) => {
      let filters;
      try {
        filters = parseAdminSearch(req.query as Record<string, unknown>);
      } catch (err) {
        if (err instanceof AdminSearchError) {
          res.status(400).json({ error: err.message });
          return;
        }
        throw err;
      }
      const caller = await callerEmail(sessions, req);
      const { rows, truncated } = await adminSearch(db, filters, config.maxPollsAdminSearchResults);
      const votedPids = await pollsEverVoted(db, rows.map((p) => p.id));
      const emails = await creatorEmails(db, rows);
      const names = await adderNames(db, rows.map((p) => p.choices));
      const accepted = await acceptedCounts(db, rows.map((p) => p.id));
      const totals = await voteTotals(db, rows.filter((p) => p.choice_mode === "Multiple-Choice Poll").map((p) => p.id));
      res.json({ polls: rows.map((p) => adminListRow(p, votedPids.has(p.id), emails.get(p.created_by_id) ?? "", accepted, totals, names, caller?.id)), truncated });
    })
  );

  router.get(
    "/api/admin/polls/:pid",
    requireOwnPoll,
    wrap(async (req, res) => {
      const poll = await findPoll(db, pidOf(req));
      if (!poll) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json(await namedAdminPollDetail(poll));
    })
  );

  router.patch(
    "/api/admin/polls/:pid",
    requireOwnPoll,
    takeTimeZone,
    wrap(async (req, res) => {
      const poll = await findPoll(db, pidOf(req));
      if (!poll) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      let $set: Partial<Poll>;
      try {
        $set = validateStateAction(poll, req.body ?? {});
      } catch (err) {
        if (err instanceof AdminError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }
      await updatePoll(store, poll._id, $set);
      res.json(await namedAdminPollDetail({ ...poll, ...$set }));
    })
  );

  router.get(
    "/api/admin/polls/:pid/invitees",
    requireOwnPoll,
    wrap(async (req, res) => {
      const poll = await findPoll(db, pidOf(req));
      if (!poll) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (!isInvitationOnly(poll)) {
        res.status(400).json({ error: NOT_INVITATION_ONLY });
        return;
      }
      res.json(await listInvitees(db, poll, config));
    })
  );

  // Never touches pollState, the edit session or the review (FR-014).
  router.post(
    "/api/admin/polls/:pid/invitees",
    requireOwnPoll,
    takeTimeZone,
    wrap(async (req, res) => {
      const poll = await findPoll(db, pidOf(req));
      if (!poll) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      if (!isInvitationOnly(poll)) {
        res.status(400).json({ error: NOT_INVITATION_ONLY });
        return;
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      const actions = (["add", "remove", "resend"] as const).filter((key) => body[key] !== undefined);
      const action = actions.length === 1 ? actions[0] : undefined;
      const valid =
        (action === "add" && typeof body.add === "string") ||
        (action === "remove" && Array.isArray(body.remove) && body.remove.every((e) => typeof e === "string")) ||
        (action === "resend" && typeof body.resend === "string");
      if (!valid) {
        res.status(400).json({ error: "Send one of add, remove or resend." });
        return;
      }
      if (isClosedState(poll)) {
        res.status(409).json({ error: "This poll is closed; its invitations can no longer change.", code: "poll-closed" });
        return;
      }
      const deps = { db, cache, config };
      const creatorId = (await pollCreatorId(db, poll._id)) ?? "";

      if (action === "add") {
        const results = await addInvitees(deps, poll, body.add as string, creatorId);
        if (poll.pollState === "OPEN") sendInBackground(poll._id);
        res.json({ results, ...(await listInvitees(db, poll, config)) });
        return;
      }
      if (action === "remove") {
        const outcome = await removeInvitees(deps, poll, body.remove as string[], body.confirmVoted === true);
        if ("voted" in outcome) {
          res.status(409).json({
            error: `${outcome.voted.join(", ")} ${outcome.voted.length === 1 ? "has" : "have"} voted; removing them removes their vote too.`,
            code: "invitee-voted",
            voted: outcome.voted
          });
          return;
        }
        res.json({ removed: outcome.removed, ...(await listInvitees(db, poll, config)) });
        return;
      }
      const email = (body.resend as string).trim().toLowerCase();
      const outcome = await resendInvitation(deps, poll, email, creatorId);
      if (!outcome.ok) {
        const { ok: _ok, status, ...refusal } = outcome;
        res.status(status).json(refusal);
        return;
      }
      res.json(await listInvitees(db, poll, config));
      sendReminder({ db, config }, poll._id, email).catch((err) =>
        console.error(`[invitations] Reminder for poll ${poll._id} failed:`, err)
      );
    })
  );

  // GET /api/admin/polls/:pid/results — aggregate + participant lists (FR-054).
  router.get(
    "/api/admin/polls/:pid/results",
    requireOwnPoll,
    wrap(async (req, res) => {
      const poll = await findPoll(db, pidOf(req));
      if (!poll) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const results = computeResults(poll);
      const voted = poll.currentVotes
        .filter((v) => v.choiceIds.length > 0)
        .map((v) => ({ emailAddress: v.emailAddress, userName: v.userName, choiceIds: v.choiceIds }))
        .sort((a, b) => a.userName.localeCompare(b.userName));
      const body: Record<string, unknown> = {
        pid: poll._id,
        title: poll.title,
        subtitle: poll.subtitle,
        choiceMode: poll.choiceMode,
        choices: results.choices,
        // Aggregates are computed from the poll, never from the roster below, so
        // they stay correct when an over-sized roster is withheld.
        totalVoted: results.totalVoted,
        voted: withinDisplayLimit(voted)
      };
      if (isInvitationOnly(poll)) {
        body.notYetVoted = withinDisplayLimit(
          poll.currentVotes
            .filter((v) => v.choiceIds.length === 0)
            .map((v) => ({ emailAddress: v.emailAddress, userName: v.userName }))
        );
      }
      res.json(body);
    })
  );

  // GET /api/admin/polls/:pid/export.{json,md} — FR-055.
  router.get(
    "/api/admin/polls/:pid/export.json",
    requireOwnPoll,
    wrap(async (req, res) => {
      const poll = await findPoll(db, pidOf(req));
      if (!poll) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.setHeader("Content-Disposition", `attachment; filename="${poll._id}.json"`);
      res.json(exportPollData(poll));
    })
  );

  router.get(
    "/api/admin/polls/:pid/export.md",
    requireOwnPoll,
    wrap(async (req, res) => {
      const poll = await findPoll(db, pidOf(req));
      if (!poll) {
        res.status(404).send("Not found");
        return;
      }
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${poll._id}.md"`);
      res.send(exportPollMarkdown(poll));
    })
  );

  // 005-admin-page-improvements FR-001–004, research.md R1: unique duplicate
  // titles ("<title> Copy", then "<title> Copy 1", ...), checked against
  // every poll state, with a bounded post-insert race guard.
  const duplicateTitlePattern = (baseTitle: string) =>
    new RegExp(`^${baseTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} Copy( \\d+)?$`);

  async function resolveDuplicateTitle(baseTitle: string): Promise<string> {
    const pattern = duplicateTitlePattern(baseTitle);
    const existing = (await titlesLike(db, baseTitle)).filter((title) => pattern.test(title));
    return nextAvailableCopyTitle(baseTitle, existing);
  }

  router.post(
    "/api/admin/polls/:pid/duplicate",
    requireOwnPoll,
    wrap(async (req, res) => {
      const source = await findPoll(db, pidOf(req));
      if (!source) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const copy = duplicatePoll(source);
      copy.title = await resolveDuplicateTitle(source.title);
      const caller = await callerEmail(sessions, req);
      await insertPoll(store, copy, caller ? { id: caller.id, name: caller.userName, email: caller.email } : undefined);

      for (let attempt = 1; attempt <= 5; attempt++) {
        const collisions = await countTitleCollisions(db, copy.title, copy._id);
        if (collisions === 0) break;
        console.warn(
          `[polls] duplicate-title race on poll ${source._id} (attempt ${attempt}) — recomputing title`
        );
        copy.title = await resolveDuplicateTitle(source.title);
        await updatePoll(store, copy._id, { title: copy.title });
      }
      const stillColliding = await countTitleCollisions(db, copy.title, copy._id);
      if (stillColliding > 0) {
        copy.title = `${copy.title} (${copy._id.slice(0, 8)})`;
        await updatePoll(store, copy._id, { title: copy.title });
        console.warn(
          `[polls] duplicate-title race unresolved after 5 attempts on poll ${source._id} — forced unique title "${copy.title}"`
        );
      }

      res.status(201).json({ pid: copy._id });
    })
  );

  return router;
}
