/**
 * Poll business logic (data-model.md, research.md). Kept apart from
 * `pollsApi.ts` (HTTP) and `store.ts` (data access) per plan.md's layering.
 */
import { randomUUID } from "node:crypto";
import type { RequestHandler, Response } from "express";
import type { AppConfig } from "../config.js";
import { isPaletteColor, normalizeColor } from "./barPalette.js";
import type { SessionCache } from "../auth/sessionCache.js";
import type {
  Choice,
  Poll,
  PollSharingMode,
  PollState,
  PollVisibility,
  VoteAnonymity,
  VoteEntry
} from "./store.js";
import {
  DELETABLE_STATES,
  POLL_SHARING_MODES,
  POLL_VISIBILITIES,
  VOTE_ANONYMITIES,
  hasVoteHistory,
  isInvitationOnly,
  isPublicVisibility,
  pollCreatorId,
  type Db
} from "./store.js";

export const TITLE_MAX = 50;
export const SUBTITLE_MAX = 30;
export const CHOICE_LABEL_MAX = 100;
export const EMAIL_MAX = 200;
/** The whole stored keywords value: every keyword plus one comma between each pair. */
export const KEYWORDS_MAX = 200;
const KEYWORD_RE = /^[a-z0-9]+( [a-z0-9]+)*$/;
/**
 * 012 FR-008/FR-009/FR-066: one number serving as both the limit a blank field means
 * on a private poll and the maximum an administrator may enter. The two are the same
 * value by requirement, so they are the same setting —
 * `ENV_MAX_PRIVATE_POLL_VOTERS`, defaulting to 100.
 *
 * This fallback exists only for the few call sites that have no config to hand; every
 * path that can reach one passes it, so the two can never disagree in practice.
 */
export const PRIVATE_VOTER_LIMIT_FALLBACK = 100;

export function privateVoterLimit(config?: Pick<AppConfig, "maxPrivatePollVoters">): number {
  return config?.maxPrivatePollVoters ?? PRIVATE_VOTER_LIMIT_FALLBACK;
}

/**
 * The effective voter ceiling: null (unlimited) on a public poll, otherwise the
 * stored limit, or the configured default when the field was left blank.
 */
export function effectiveVoterLimit(
  poll: Pick<Poll, "pollVisibility" | "voterCountLimit">,
  config?: Pick<AppConfig, "maxPrivatePollVoters">
): number | null {
  if (isPublicVisibility(poll.pollVisibility)) return null;
  return poll.voterCountLimit ?? privateVoterLimit(config);
}
const MAX_INVITED = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 012 US10 (FR-059): normalise and validate a participant list arriving with a publish.
 *
 * Participant changes used to write immediately through three routes of their own,
 * which meant they were saved the instant they were clicked — Save and Publish stayed
 * disabled because there was nothing pending, and Cancel could not undo them. That is
 * the same defect R1 fixed for the choice list: two save models on one page. These
 * lists now travel with the publish like every other field.
 */
function validateEmailList(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) {
    throw new AdminError(400, `${label} must be a list of email addresses.`);
  }
  const out: string[] = [];
  for (const entry of raw) {
    const email = typeof entry === "string" ? entry.trim().toLowerCase() : "";
    if (email.length === 0 || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
      throw new AdminError(400, `${label} contains an invalid email address.`);
    }
    if (!out.includes(email)) out.push(email);
  }
  if (out.length > MAX_INVITED) {
    throw new AdminError(400, `${label} may hold at most ${MAX_INVITED} addresses.`);
  }
  return out;
}

/** FR-036 AC1 (004) / FR-002 (011): a brand-new poll's documented defaults. */
export function createDefaultPoll(now: Date = new Date()): Poll {
  const timestamp = now.toISOString().slice(0, 19).replace("T", " ");
  return {
    _id: randomUUID(),
    title: `New Poll ${timestamp}`,
    subtitle: "",
    keywords: "",
    choiceMode: "Single-Choice Poll",

    voteMutability: "Dynamic-Vote Poll",
    pollVisibility: "Public Poll",
    pollSharingMode: "Anyone With The Link",
    voteAnonymity: "Yes",
    voterCountLimit: null, // not applicable while Public Poll (the default visibility)
    pollState: "INITIALIZED",
    createdAt: now,
    startAt: null,
    endAt: null,
    choices: [
      { id: randomUUID(), label: "Choice 1", position: 0 },
      { id: randomUUID(), label: "Choice 2", position: 1 }
    ],
    invitedVoterList: [],
    bannedVoterList: [],
    currentVotes: [],
    pollStateBeforeEditUpdate: null,
    pollEditUpdateHeartbeatTimestamp: null,
    pollEditUpdateClientGUID: null,
    pollApprovalTimestamp: null,
    pollAcceptabilityScreeningAttempts: 0,
    pollRejectionReason: null,
    timeZone: null,
    lineGraphEnabled: false
  };
}

/**
 * FR-041..FR-045 (011): the schedule-appropriate state for a poll, with both
 * bounds inclusive. An absent start means "already started"; an absent end means
 * the poll never closes on its own.
 *
 * Unlike the state it replaces, this is not consulted on read — the schedule
 * sweep calls it and *writes* the result, so `pollState` is always authoritative.
 */
export function evaluateSchedule(
  poll: Pick<Poll, "startAt" | "endAt">,
  now: Date = new Date()
): Extract<PollState, "WAITING TO OPEN" | "OPEN" | "CLOSED"> {
  if (poll.startAt && now < poll.startAt) return "WAITING TO OPEN";
  if (poll.endAt && now > poll.endAt) return "CLOSED";
  return "OPEN";
}

/**
 * FR-046 fail-safe: a poll whose start is after its end should be impossible —
 * both editing surfaces prevent it — but if encountered, the start is pulled to
 * one second before the end and the poll is closed.
 */
export function correctInvertedSchedule(
  poll: Pick<Poll, "startAt" | "endAt">
): { startAt: Date; pollState: PollState } | null {
  if (!poll.startAt || !poll.endAt || poll.startAt <= poll.endAt) return null;
  return { startAt: new Date(poll.endAt.getTime() - 1000), pollState: "CLOSED" };
}

/**
 * FR-007 (011): has this poll *ever* received a vote?
 *
 * Answered from the append-only history, never from `currentVotes` — a vote that
 * was deleted, or removed by banning its voter, still counts. This is the whole
 * basis of the edit-versus-update split, so it must stay true after a deletion.
 */
export async function hasEverBeenVotedOn(db: Db, pid: string): Promise<boolean> {
  return hasVoteHistory(db, pid);
}

/**
 * FR-006 / FR-008 (011): which editing surface, if any, a poll may open.
 *
 * The state decides whether *either* surface is offered; the vote history decides
 * which one. A poll that has ever been voted on is permanently on the reduced
 * update surface — deleting the vote does not restore full editing (FR-007).
 */
/** The choice labels a poll is created with. */
export const DEFAULT_CHOICE_LABELS = ["Choice 1", "Choice 2"] as const;
/** The title `createDefaultPoll` generates, e.g. "New Poll 2026-01-01 00:00:00". */
export const DEFAULT_TITLE_RE = /^New Poll \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export function hasDefaultChoices(poll: Pick<Poll, "choices">): boolean {
  const labels = [...poll.choices].sort((a, b) => a.position - b.position).map((c) => c.label);
  return (
    labels.length === DEFAULT_CHOICE_LABELS.length &&
    labels.every((l, i) => l === DEFAULT_CHOICE_LABELS[i])
  );
}

/**
 * FR-024/FR-025 (011): may this poll be published?
 *
 * FR-024 blocks a poll where every field is still default; FR-025 blocks one
 * whose choices are still default even if the title and subtitle changed. The
 * second subsumes the first, so the observable rule is simply that default
 * choices block publishing — a poll with the starter choices is not ready,
 * whatever else was edited. Both are checked explicitly so the requirement each
 * one implements stays visible.
 */
export function isAllDefaults(poll: Pick<Poll, "title" | "subtitle" | "choices">): boolean {
  const everythingDefault =
    DEFAULT_TITLE_RE.test(poll.title) && poll.subtitle === "" && hasDefaultChoices(poll);
  return everythingDefault || hasDefaultChoices(poll);
}

export type EditMode = "EDIT" | "UPDATE";

export function editModeFor(
  poll: Pick<Poll, "pollState">,
  hasEverVoted: boolean
): { mode: EditMode } | { refusal: "LOCKED" | "INELIGIBLE"; message: string } {
  if (poll.pollState === "EDITING") {
    return {
      refusal: "LOCKED",
      message: "This poll is currently being edited. Please try again shortly."
    };
  }
  if (poll.pollState === "AWAITING APPROVAL") {
    return { refusal: "INELIGIBLE", message: "This poll is awaiting approval and cannot be edited." };
  }
  if (poll.pollState === "ARCHIVED") {
    return { refusal: "INELIGIBLE", message: "This poll is archived and cannot be changed." };
  }
  return { mode: hasEverVoted ? "UPDATE" : "EDIT" };
}

/**
 * 012 FR-030/FR-031: every per-row action rule, decided in one place. The admin
 * list renders enablement from these booleans and re-derives no state rule of its
 * own, and the same from-state predicates back `validateStateAction`'s refusals —
 * so a greyed button and a refused request can never disagree.
 */
export interface PollCapabilities {
  canEdit: boolean;
  canUpdate: boolean;
  canOpen: boolean;
  canClose: boolean;
  canArchive: boolean;
  canDelete: boolean;
  canRescreen: boolean;
}

/** States from which an administrator may manually open a poll (012 FR-024). */
export const OPENABLE_STATES: readonly PollState[] = ["WAITING TO OPEN", "CLOSED"] as const;
/** States from which an administrator may manually close a poll (012 FR-024). */
export const CLOSEABLE_STATES: readonly PollState[] = ["WAITING TO OPEN", "OPEN"] as const;

export function capabilitiesFor(
  poll: Pick<
    Poll,
    "pollState" | "pollAcceptabilityScreeningAttempts"
  >,
  hasEverBeenVotedOn: boolean,
  maxScreeningAttempts: number
): PollCapabilities {
  const mode = editModeFor(poll, hasEverBeenVotedOn);
  return {
    canEdit: "mode" in mode && mode.mode === "EDIT",
    canUpdate: "mode" in mode && mode.mode === "UPDATE",
    canOpen: (OPENABLE_STATES as readonly string[]).includes(poll.pollState),
    canClose: (CLOSEABLE_STATES as readonly string[]).includes(poll.pollState),
    // FR-049 (011): archiving is only ever from CLOSED.
    canArchive: poll.pollState === "CLOSED",
    canDelete: (DELETABLE_STATES as readonly string[]).includes(poll.pollState),
    // FR-040 (011): the escape hatch is offered only once the budget is spent —
    // before that the sweep is still retrying on its own.
    canRescreen:
      poll.pollState === "REJECTED" &&
      poll.pollAcceptabilityScreeningAttempts >= maxScreeningAttempts
  };
}

export function canEditPoll(poll: Pick<Poll, "pollState">, hasEverVoted: boolean): boolean {
  const r = editModeFor(poll, hasEverVoted);
  return "mode" in r && r.mode === "EDIT";
}

export function canUpdatePoll(poll: Pick<Poll, "pollState">, hasEverVoted: boolean): boolean {
  const r = editModeFor(poll, hasEverVoted);
  return "mode" in r && r.mode === "UPDATE";
}

export interface ChoiceResult {
  id: string;
  label: string;
  position: number;
  count: number;
  pct: number;
}

export interface PollResults {
  choices: ChoiceResult[];
  totalVoted: number;
  totalNotYetVoted: number;
}

/**
 * FR-021: a single-choice poll's percentage is computed against distinct
 * participants who have voted; a multiple-choice poll's against the total
 * number of selections, so its percentages add up to 100. Every stored choice
 * counts — 011 removed the `(removed)` marker, so there is nothing to exclude.
 */
export function computeResults(poll: Pick<Poll, "choices" | "currentVotes"> & Partial<Pick<Poll, "choiceMode">>): PollResults {
  const activeChoices = [...poll.choices].sort((a, b) => a.position - b.position);
  const votedEntries = poll.currentVotes.filter((v) => v.choiceIds.length > 0);
  const totalVoted = votedEntries.length;
  const totalNotYetVoted = poll.currentVotes.length - totalVoted;

  const counts = activeChoices.map((c) => votedEntries.filter((v) => v.choiceIds.includes(c.id)).length);
  const share = poll.choiceMode === "Multiple-Choice Poll" ? counts.reduce((sum, n) => sum + n, 0) : totalVoted;

  const choices: ChoiceResult[] = activeChoices.map((c, i) => {
    const count = counts[i]!;
    const pct = share > 0 ? Math.round((count / share) * 100) : 0;
    return { id: c.id, label: c.label, position: c.position, count, pct };
  });

  return { choices, totalVoted, totalNotYetVoted };
}

/**
 * 012 FR-057: why *this viewer* may not vote in this poll — the checks that are about
 * who they are rather than what they submitted or when.
 *
 * Extracted so the card and the server cannot disagree. The vote route throws from
 * it; `buildPollDetail` reports it, so the card can say "you have been removed from
 * this poll" up front instead of offering a Vote button that leads to a Submit button
 * that fails in silence. The server check remains authoritative and unchanged —
 * this only stops the interface inviting an action it will refuse (004 FR-028).
 *
 * Returns null when nothing about the viewer blocks them. State-based reasons
 * (closed, being edited) are deliberately not here: the card already has treatments
 * for those, driven by `pollState`.
 */
export function viewerVoteBlock(
  poll: Pick<
    Poll,
    | "pollVisibility"
    | "pollSharingMode"
    | "voterCountLimit"
    | "invitedVoterList"
    | "bannedVoterList"
    | "currentVotes"
  >,
  callerEmail: string,
  isNewVoter: boolean,
  config?: Pick<AppConfig, "maxPrivatePollVoters">
): { status: number; message: string } | null {
  if (poll.bannedVoterList.includes(callerEmail)) {
    return { status: 403, message: "You have been removed from this poll and cannot vote in it." };
  }
  if (isInvitationOnly(poll) && !poll.invitedVoterList.includes(callerEmail)) {
    return { status: 403, message: "You are not invited to this poll." };
  }
  // 012 FR-010: enforced for every private visibility, not just link polls, and a
  // blank limit binds at the configured default rather than meaning unlimited.
  const limit = effectiveVoterLimit(poll, config);
  if (limit !== null && isNewVoter) {
    const distinctVoters = poll.currentVotes.filter((v) => v.choiceIds.length > 0).length;
    if (distinctVoters >= limit) {
      return { status: 403, message: "This poll has reached its maximum number of votes." };
    }
  }
  return null;
}

export class VoteError extends Error {
  status: number;
  /**
   * 012 FR-044: a machine-readable discriminator, set only where the client has to
   * react differently rather than merely display the message. The card branches on
   * this — never on the message text, which this feature has already reworded once.
   */
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * FR-017/030: whether `callerEmail` (undefined for a guest) may even view
 * this poll. PUBLIC_POLL is always viewable; private modes require sign-in,
 * and invitation-only additionally requires being on the invited list.
 */
export function checkViewEligibility(
  poll: Pick<Poll, "pollVisibility" | "pollSharingMode" | "invitedVoterList">,
  callerEmail: string | undefined
): { status: number; error: string } | null {
  if (isPublicVisibility(poll.pollVisibility)) return null;
  if (!callerEmail) {
    return { status: 403, error: "Sign in to view this poll." };
  }
  if (isInvitationOnly(poll) && !poll.invitedVoterList.includes(callerEmail)) {
    return { status: 403, error: "You are not invited to this poll." };
  }
  return null;
}

/**
 * FR-023/024/027: reject an empty submission, more than one choice on a
 * Single-Choice Poll, or a vote against a poll that isn't currently ACTIVE
 * (naming the actual state). FR-012: a Final-Vote Poll blocks a second vote
 * — except when the existing vote is empty (never voted, or reset to "no
 * vote" by a choice removal per FR-042, which must always allow a re-vote).
 * FR-028/029/030/051: banned/not-invited/voter-cap eligibility.
 */
export function validateVoteSubmission(
  poll: Pick<
    Poll,
    | "pollState"
    | "startAt"
    | "endAt"
    | "choiceMode"
    | "voteMutability"
    | "pollVisibility"
    | "pollSharingMode"
    | "voterCountLimit"
    | "invitedVoterList"
    | "bannedVoterList"
    | "currentVotes"
  >,
  callerEmail: string,
  choiceIds: string[],
  existingVote: Pick<VoteEntry, "choiceIds"> | undefined,
  now: Date = new Date(),
  config?: Pick<AppConfig, "maxPrivatePollVoters">
): void {
  void now;
  const isNewVoter = !existingVote || existingVote.choiceIds.length === 0;
  const block = viewerVoteBlock(poll, callerEmail, isNewVoter, config);
  if (block) throw new VoteError(block.status, block.message);
  validateVoteChoicesAndState(poll, choiceIds, !isNewVoter);
}

/**
 * The checks that depend on what was submitted and on the poll's state rather than on
 * who the voter is: shared by the stored-poll validator above and the cache-fed vote
 * path, so both refuse with the same messages.
 */
export function validateVoteChoicesAndState(
  poll: Pick<Poll, "pollState" | "choiceMode" | "voteMutability">,
  choiceIds: string[],
  hasExistingVote: boolean
): void {
  if (choiceIds.length === 0) {
    throw new VoteError(400, "Select at least one choice.");
  }
  if (poll.choiceMode === "Single-Choice Poll" && choiceIds.length > 1) {
    throw new VoteError(400, "This poll only allows selecting one choice.");
  }
  // The stored state is the only gate. Withholding a poll from public listings does
  // not stop a vote — a voter with the page already open still reaches this endpoint.
  // An EDITING poll is checked first so the client gets the code it retries on.
  if (poll.pollState === "EDITING") {
    throw new VoteError(
      409,
      "This poll is momentarily unavailable to cast a vote. Please try again shortly.",
      "POLL_EDITING"
    );
  }
  if (poll.pollState === "WAITING TO OPEN") {
    throw new VoteError(409, "This poll has not started yet.");
  }
  if (poll.pollState !== "OPEN") {
    throw new VoteError(409, "This poll is not open for voting.");
  }
  if (poll.voteMutability === "Final-Vote Poll" && hasExistingVote) {
    throw new VoteError(409, "You have already voted on this poll and cannot change your vote.");
  }
}

/**
 * FR-012 (011): autosave is gone, so these field rules are no longer reached by a
 * per-keystroke PATCH — they run once, when the poll is published. The rules
 * themselves are unchanged: mechanics locking, the access/visibility
 * auto-switches, and the schedule checks all still apply.
 */
export function validatePollFields(
  poll: Poll,
  body: Record<string, unknown>,
  hasEverVoted: boolean,
  now: Date = new Date(),
  config?: Pick<AppConfig, "maxPrivatePollVoters">
): Partial<Poll> {
  const $set: Partial<Poll> = {};
  void now;

  if (body.title !== undefined) {
    $set.title = validateFieldLength(body.title, TITLE_MAX, "Title");
  }
  if (body.subtitle !== undefined) {
    $set.subtitle = validateFieldLength(body.subtitle, SUBTITLE_MAX, "Subtitle");
  }

  if (body.choiceMode !== undefined) {
    // 012 FR-004: frozen alongside pollVisibility once the poll has a vote. The
    // multi-vote check below is now unreachable through this path and is kept
    // only because `validatePollFields` is also called with hasEverVoted=false
    // for a poll whose votes were all removed by a ban.
    if (hasEverVoted) {
      throw new AdminError(409, "choiceMode cannot be changed after the poll has received a vote.");
    }
    if (body.choiceMode !== "Single-Choice Poll" && body.choiceMode !== "Multiple-Choice Poll") {
      throw new AdminError(400, "Invalid choiceMode.");
    }
    if (body.choiceMode === "Single-Choice Poll") {
      const anyChoiceMultiVoted = poll.choices.some(
        (c) => poll.currentVotes.filter((v) => v.choiceIds.includes(c.id)).length > 1
      );
      if (anyChoiceMultiVoted) {
        throw new AdminError(409, "Cannot switch to single-choice: a choice already has more than one vote.");
      }
    }
    $set.choiceMode = body.choiceMode;
  }

  if (body.voteMutability !== undefined) {
    // 012 FR-004: frozen alongside pollVisibility once the poll has a vote.
    if (hasEverVoted) {
      throw new AdminError(409, "voteMutability cannot be changed after the poll has received a vote.");
    }
    if (body.voteMutability !== "Final-Vote Poll" && body.voteMutability !== "Dynamic-Vote Poll") {
      throw new AdminError(400, "Invalid voteMutability.");
    }
    $set.voteMutability = body.voteMutability;
  }

  if (body.pollVisibility !== undefined) {
    if (hasEverVoted) {
      throw new AdminError(409, "pollVisibility cannot be changed after the poll has received a vote.");
    }
    if (!(POLL_VISIBILITIES as readonly string[]).includes(body.pollVisibility as string)) {
      throw new AdminError(400, "Invalid pollVisibility.");
    }
    $set.pollVisibility = body.pollVisibility as PollVisibility;
  }

  if (body.pollSharingMode !== undefined) {
    if (hasEverVoted) {
      throw new AdminError(409, "pollSharingMode cannot be changed after the poll has received a vote.");
    }
    if (!(POLL_SHARING_MODES as readonly string[]).includes(body.pollSharingMode as string)) {
      throw new AdminError(400, "Invalid pollSharingMode.");
    }
    $set.pollSharingMode = body.pollSharingMode as PollSharingMode;
  }

  if (body.voteAnonymity !== undefined) {
    if (hasEverVoted) {
      throw new AdminError(409, "voteAnonymity cannot be changed after the poll has received a vote.");
    }
    if (!(VOTE_ANONYMITIES as readonly string[]).includes(body.voteAnonymity as string)) {
      throw new AdminError(400, "Invalid voteAnonymity.");
    }
    $set.voteAnonymity = body.voteAnonymity as VoteAnonymity;
  }

  if (body.keywords !== undefined) {
    if (hasEverVoted) {
      throw new AdminError(409, "keywords cannot be changed after the poll has received a vote.");
    }
    $set.keywords = validateKeywords(body.keywords);
  }
  // Keywords only make a public poll findable, so a private poll never keeps any.
  if (!isPublicVisibility($set.pollVisibility ?? poll.pollVisibility) && ($set.keywords !== undefined || poll.keywords !== "")) {
    $set.keywords = "";
  }

  if (body.voterCountLimit !== undefined) {
    // 012 FR-061: a cleared field arrives from a form as "" — and `Number("")` is 0,
    // which used to fail the range check and report "must be a whole number between
    // 1 and 500" for the perfectly ordinary act of emptying the box. Blank of any
    // shape means cleared.
    const raw = body.voterCountLimit;
    const isBlank = raw === null || (typeof raw === "string" && raw.trim() === "");
    if (isBlank) {
      $set.voterCountLimit = null; // cleared: unlimited on a public poll, the configured default on a private one
    } else {
      const n = Number(raw);
      const max = privateVoterLimit(config);
      if (!Number.isInteger(n) || n <= 0 || n > max) {
        throw new AdminError(400, `voterCountLimit must be a whole number between 1 and ${max}.`);
      }
      $set.voterCountLimit = n;
    }
  }

  if (body.lineGraphEnabled !== undefined) {
    if (typeof body.lineGraphEnabled !== "boolean") {
      throw new AdminError(400, "lineGraphEnabled must be true or false.");
    }
    $set.lineGraphEnabled = body.lineGraphEnabled;
  }

  // 012 US10 (FR-059/FR-060): the participant lists arrive as the desired final
  // state, and currentVotes is derived from them rather than mutated in place by
  // three separate routes. Banning is what removes a vote, and it only takes effect
  // here — on save — so Cancel genuinely discards it.
  if (body.invitedVoterList !== undefined || body.bannedVoterList !== undefined) {
    const invited =
      body.invitedVoterList !== undefined
        ? validateEmailList(body.invitedVoterList, "The invited list")
        : [...poll.invitedVoterList];
    const banned =
      body.bannedVoterList !== undefined
        ? validateEmailList(body.bannedVoterList, "The banned list")
        : [...poll.bannedVoterList];

    // A banned address cannot also be invited: banning removes the invitation
    // (FR-017a), and un-banning deliberately does not restore it.
    const finalInvited = invited.filter((e) => !banned.includes(e));
    $set.invitedVoterList = finalInvited;
    $set.bannedVoterList = banned;

    const inviteOnly = isInvitationOnly({
      pollVisibility: ($set.pollVisibility ?? poll.pollVisibility) as PollVisibility,
      pollSharingMode: ($set.pollSharingMode ?? poll.pollSharingMode) as PollSharingMode
    });
    let votes = poll.currentVotes.filter((v) => !banned.includes(v.emailAddress));
    if (inviteOnly) {
      // Only invited people belong on an invitation-only poll's roll, and every
      // invited address gets a not-yet-voted placeholder.
      votes = votes.filter((v) => finalInvited.includes(v.emailAddress));
      for (const email of finalInvited) {
        if (!votes.some((v) => v.emailAddress === email)) {
          votes.push({ emailAddress: email, userName: "", choiceIds: [], votedAt: null });
        }
      }
    }
    $set.currentVotes = votes;
  }

  // 012 FR-003: no field is written as a consequence of another being set. The
  // access/visibility auto-switch that used to live here is gone with the pair it
  // reconciled, and with it the public->private auto-fill of 500 (FR-007).
  // FR-006: a public poll never carries a limit.
  const effectiveVisibility = $set.pollVisibility ?? poll.pollVisibility;
  if (isPublicVisibility(effectiveVisibility)) {
    $set.voterCountLimit = null;
  }

  let nextStartAt = poll.startAt;
  let nextEndAt = poll.endAt;

  if (body.startAt !== undefined) {
    nextStartAt = body.startAt === null ? null : new Date(body.startAt as string);
    if (nextStartAt && Number.isNaN(nextStartAt.getTime())) {
      throw new AdminError(400, "Invalid startAt.");
    }
    if (hasEverVoted && poll.startAt && poll.startAt <= now && nextStartAt && nextStartAt > now) {
      throw new AdminError(
        409,
        "Cannot move the start time into the future once the poll has a vote and has already started."
      );
    }
    $set.startAt = nextStartAt;
  }

  if (body.endAt !== undefined) {
    nextEndAt = body.endAt === null ? null : new Date(body.endAt as string);
    if (nextEndAt && Number.isNaN(nextEndAt.getTime())) {
      throw new AdminError(400, "Invalid endAt.");
    }
    $set.endAt = nextEndAt;
  }

  if (nextStartAt && nextEndAt && nextStartAt >= nextEndAt) {
    throw new AdminError(400, "startAt must be before endAt.");
  }

  return $set;
}

/**
 * All that `PATCH /api/admin/polls/:pid` still accepts (011 FR-012): the two
 * explicit administrator state actions. Content and schedule reach the server
 * only through publish, so a half-finished edit can never become public.
 */
export const PATCH_ALLOWED_FIELDS = ["pollState"] as const;

export function validateStateAction(
  poll: Poll,
  body: Record<string, unknown>,
  now: Date = new Date()
): Partial<Poll> {
  const disallowed = Object.keys(body).filter(
    (k) => !(PATCH_ALLOWED_FIELDS as readonly string[]).includes(k)
  );
  if (disallowed.length > 0) {
    throw new AdminError(
      400,
      `Only ${PATCH_ALLOWED_FIELDS.join(", ")} may be changed here; publish the poll to save ${disallowed.join(", ")}.`
    );
  }
  if (body.pollState === undefined) return {};

  const target = body.pollState;
  if (target !== "OPEN" && target !== "CLOSED" && target !== "ARCHIVED") {
    throw new AdminError(400, "pollState must be OPEN, CLOSED or ARCHIVED.");
  }
  // FR-050 (011): archiving is terminal — nothing transitions out of it.
  if (poll.pollState === "ARCHIVED") {
    throw new AdminError(409, "This poll is archived and cannot be changed.");
  }

  /**
   * 012 T039/T040 (FR-024..FR-028). Each transition writes the schedule fields into
   * a shape `evaluateSchedule` independently re-derives the same state from, so the
   * date sweep *confirms* the administrator's choice on its next tick instead of
   * reverting it. That is what lets this work with no override flag anywhere in the
   * model — and why the rules are load-bearing rather than cosmetic.
   */
  if (target === "OPEN") {
    if (!(OPENABLE_STATES as readonly string[]).includes(poll.pollState)) {
      throw new AdminError(
        409,
        `A poll in the ${poll.pollState} state cannot be opened.`
      );
    }
    // No startAt => not WAITING TO OPEN. No *past* endAt => not CLOSED. A future
    // end is kept, because it is still a schedule the poll can honour.
    const clearsEnd = poll.endAt !== null && poll.endAt < now;
    return { pollState: "OPEN", startAt: null, ...(clearsEnd ? { endAt: null } : {}) };
  }

  if (target === "CLOSED") {
    if (!(CLOSEABLE_STATES as readonly string[]).includes(poll.pollState)) {
      throw new AdminError(
        409,
        `A poll in the ${poll.pollState} state cannot be closed.`
      );
    }
    // endAt is in the past by the next tick, and a *future* start would otherwise
    // pull the poll back to WAITING TO OPEN. A past start is left alone: it is the
    // truth about when the poll ran.
    const clearsStart = poll.startAt !== null && poll.startAt > now;
    return { pollState: "CLOSED", endAt: now, ...(clearsStart ? { startAt: null } : {}) };
  }

  // FR-027: archiving is only ever from CLOSED, and writes *nothing* but the state.
  // The blanket `endAt = now` this replaces rewrote a poll's real closing date and
  // corrupted the JSON and Markdown exports that carry it.
  if (poll.pollState !== "CLOSED") {
    throw new AdminError(409, "A poll can only be archived from the CLOSED state.");
  }
  return { pollState: "ARCHIVED" };
}

/**
 * 012 T080 (FR-050): the allow-list predicate, extracted so the route gate below and
 * the `isAdmin` rendering hint on GET /api/me are the same rule rather than two
 * copies that agree today. `config.admins` is already trimmed and lower-cased at
 * load, so all this does is normalise the incoming address the same way.
 */
export function isAdminEmail(email: string | undefined, config: AppConfig): boolean {
  if (!email) return false;
  return config.admins.includes(email.trim().toLowerCase());
}

export type Permission = "View Polls" | "Vote on Polls" | "Create Poll";

export function hasPermission(permissions: readonly string[] | undefined, grant: Permission): boolean {
  return permissions?.includes(grant) ?? false;
}

export interface Caller {
  id?: string;
  email?: string;
  permissions?: readonly string[];
}

export const NO_VOTE_PERMISSION = "You do not have permission to vote.";
export const NO_VIEW_PERMISSION = "You do not have permission to view polls.";

export function holdsPermission(user: Caller, grant: Permission, config: AppConfig): boolean {
  return isAdminEmail(user.email, config) || hasPermission(user.permissions, grant);
}

export function canReachAdmin(user: Caller, config: AppConfig): boolean {
  return (
    isAdminEmail(user.email, config) ||
    (hasPermission(user.permissions, "Create Poll") && hasPermission(user.permissions, "View Polls"))
  );
}

export function canActOnPoll(user: Caller, createdById: string, config: AppConfig): boolean {
  if (isAdminEmail(user.email, config)) return true;
  return canReachAdmin(user, config) && createdById !== "" && createdById === user.id;
}

export function effectivePermissions(user: Caller, config: AppConfig): string[] {
  const stored = [...(user.permissions ?? [])];
  return isAdminEmail(user.email, config) ? ["Administrator", ...stored] : stored;
}

/** FR-035/research.md R6: admin allow-list gate, shared by pollsApi.ts and pages.ts. */
/**
 * 013 FR-042/FR-045 (research R10): one factory, two instances, two refusal
 * shapes. `pages.ts` builds a page-shaped instance so an unauthorised visitor
 * gets an explanatory card; `pollsApi.ts` keeps the JSON shape every admin API
 * caller expects. The status is 403 either way — the request is refused, and
 * only the body differs.
 *
 * Changing this function's own output would rewrite every `/api/admin/*`
 * refusal into HTML, which is why the shape is a parameter rather than an edit.
 */
export function createRequireAdmin({
  sessions,
  config,
  refuse,
  allow = (user) => isAdminEmail(user.email, config)
}: {
  sessions: SessionCache;
  config: AppConfig;
  refuse?: (res: Response) => void;
  allow?: (user: Caller) => boolean;
}): RequestHandler {
  const deny = refuse ?? ((res: Response) => { res.status(403).json({ error: "Not authorized" }); });
  return (req, res, next) => {
    sessions
      .getSession(req)
      .then((session) => {
        if (!session || !allow(session.user as Caller)) {
          deny(res);
          return;
        }
        next();
      })
      .catch(next);
  };
}

/**
 * Answers "not found" for a poll the caller may not manage, so a creator learns nothing
 * about another user's poll. Runs after a gate that has already required a session.
 */
export function createRequirePollOwner({
  sessions,
  config,
  db,
  pidOf,
  refuse = (res) => { res.status(404).json({ error: "Not found" }); }
}: {
  sessions: SessionCache;
  config: AppConfig;
  db: Db;
  pidOf: (req: Parameters<RequestHandler>[0]) => string;
  refuse?: (res: Response) => void;
}): RequestHandler {
  return (req, res, next) => {
    (async () => {
      const session = await sessions.getSession(req);
      const user = (session?.user ?? {}) as Caller;
      if (isAdminEmail(user.email, config)) return next();
      const createdById = await pollCreatorId(db, pidOf(req));
      if (createdById === null || !canActOnPoll(user, createdById, config)) return refuse(res);
      next();
    })().catch(next);
  };
}

export const LIMITS = { TITLE_MAX, SUBTITLE_MAX, CHOICE_LABEL_MAX, EMAIL_MAX, MAX_INVITED, KEYWORDS_MAX };

/** FR-055: poll config + results only, excluding the voter roll. */
export function exportPollData(poll: Pick<Poll, "_id" | "title" | "subtitle" | "choices" | "currentVotes"> & Partial<Pick<Poll, "choiceMode">>) {
  const results = computeResults(poll);
  return {
    pid: poll._id,
    title: poll.title,
    subtitle: poll.subtitle,
    choices: results.choices,
    totalVoted: results.totalVoted,
    participants: poll.currentVotes
      .filter((v) => v.choiceIds.length > 0)
      .map((v) => ({ emailAddress: v.emailAddress, userName: v.userName, choiceIds: v.choiceIds }))
  };
}

export function exportPollMarkdown(poll: Pick<Poll, "_id" | "title" | "subtitle" | "choices" | "currentVotes"> & Partial<Pick<Poll, "choiceMode">>): string {
  const data = exportPollData(poll);
  let md = `# ${data.title}\n\n`;
  if (data.subtitle) md += `${data.subtitle}\n\n`;
  md += `| Choice | Votes | % |\n|---|---|---|\n`;
  data.choices.forEach((c) => {
    md += `| ${c.label} | ${c.count} | ${c.pct}% |\n`;
  });
  md += `\nTotal voted: ${data.totalVoted}\n`;
  return md;
}

export class AdminError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** FR-002/003: length-limit validation shared by title/subtitle. */
/** "" or comma-separated keywords of lower-case letters, digits and single spaces, without repeats. */
export function validateKeywords(value: unknown): string {
  if (value === "") return "";
  const valid =
    typeof value === "string" &&
    value.length <= KEYWORDS_MAX &&
    value.split(",").every((k) => KEYWORD_RE.test(k)) &&
    new Set(value.split(",")).size === value.split(",").length;
  if (!valid) {
    throw new AdminError(
      400,
      `Keywords must be lower-case letters, digits and single spaces, separated by commas, with no repeats, and at most ${KEYWORDS_MAX} characters in total.`
    );
  }
  return value;
}

export function validateFieldLength(value: unknown, max: number, fieldName: string): string {
  if (typeof value !== "string" || value.length > max) {
    throw new AdminError(400, `${fieldName} must be at most ${max} characters.`);
  }
  return value;
}

/**
 * 006-poll-choices-editor FR-006/007 (data-model.md): replaces the poll's entire active
 * choice set outright from a flat list of labels — no attempt to preserve an existing
 * choice's identity across a save, even one whose label is unchanged (research.md R1).
 *
 * 011: the submitted list replaces the stored list entirely, retaining no record of the
 * previous choices (FR-010). No vote reconciliation is needed, because this only ever
 * runs for a poll that has never been voted on.
 */
export function replaceChoices(
  poll: Poll,
  labels: unknown,
  config: Pick<AppConfig, "minChoices" | "maxChoices">,
  colors?: unknown
): Choice[] {
  if (!Array.isArray(labels)) {
    throw new AdminError(400, "labels must be an array.");
  }
  const paired = checkedColors(colors, labels.length, storedColorsOf(poll))
    .map((color, i) => ({ label: typeof labels[i] === "string" ? labels[i].trim() : "", color }))
    .filter((entry) => entry.label.length > 0);
  const cleaned = paired.map((entry) => entry.label);

  // 014: the bounds are ENV_MIN_CHOICES / ENV_MAX_CHOICES rather than constants.
  if (cleaned.length < config.minChoices || cleaned.length > config.maxChoices) {
    throw new AdminError(400, `A poll must have between ${config.minChoices} and ${config.maxChoices} choices.`);
  }
  if (cleaned.some((label) => label.length > CHOICE_LABEL_MAX)) {
    throw new AdminError(400, `Choice label must be at most ${CHOICE_LABEL_MAX} characters.`);
  }
  if (new Set(cleaned).size !== cleaned.length) {
    throw new AdminError(409, "Choice labels must be unique.");
  }

  // FR-010 (011): the submitted list replaces the stored list outright. No
  // tombstones are retained and no vote reconciliation is needed — this only
  // runs for a poll that has never been voted on.
  const newChoices: Choice[] = paired.map(({ label, color }, position) => ({
    id: randomUUID(),
    label,
    position,
    ...(color ? { color } : {})
  }));
  poll.choices = newChoices;
  return newChoices;
}

function storedColorsOf(poll: Pick<Poll, "choices">): Set<string> {
  return new Set(poll.choices.flatMap((c) => (c.color ? [c.color.toUpperCase()] : [])));
}

function checkedColor(value: unknown, stored: ReadonlySet<string>): string | undefined {
  if (value === null || value === undefined) return undefined;
  const color = normalizeColor(value);
  if (color === undefined || !(isPaletteColor(color) || stored.has(color))) {
    throw new AdminError(400, "Colors must come from the palette.");
  }
  return color;
}

function checkedColors(colors: unknown, expected: number, stored: ReadonlySet<string>): (string | undefined)[] {
  if (colors === null || colors === undefined) return Array.from({ length: expected }, () => undefined);
  if (!Array.isArray(colors) || colors.length !== expected) {
    throw new AdminError(400, "Colors must have one entry per choice.");
  }
  return colors.map((color) => checkedColor(color, stored));
}

export function applyChoiceColors(poll: Poll, colors: unknown): Choice[] {
  if (!Array.isArray(colors)) throw new AdminError(400, "Colors must have one entry per choice.");
  const ordered = [...poll.choices].sort((a, b) => a.position - b.position);
  const checked = checkedColors(colors, ordered.length, storedColorsOf(poll));
  return ordered.map(({ id, label, position }, i) => ({
    id,
    label,
    position,
    ...(checked[i] ? { color: checked[i] } : {})
  }));
}

/**
 * FR-044 (004): same configuration, a new PID, no votes, no schedule.
 *
 * The copy starts INITIALIZED (011). It carries the source's title, subtitle and
 * choices, so inheriting an approved state would put unscreened content in front
 * of the public; starting at the beginning of the lifecycle means it must be
 * published and screened like any other poll. The source is left untouched, so
 * duplicating an ARCHIVED poll is a normal way to re-run it.
 */
export function duplicatePoll(source: Poll, now: Date = new Date()): Poll {
  const activeChoices = [...source.choices].sort((a, b) => a.position - b.position);
  const invitedVoterList = isInvitationOnly(source) ? [...source.invitedVoterList] : [];

  return {
    _id: randomUUID(),
    title: source.title,
    subtitle: source.subtitle,
    keywords: source.keywords,
    choiceMode: source.choiceMode,
    voteMutability: source.voteMutability,
    pollVisibility: source.pollVisibility,
    pollSharingMode: source.pollSharingMode,
    voteAnonymity: source.voteAnonymity,
    voterCountLimit: source.voterCountLimit,
    pollState: "INITIALIZED",
    createdAt: now,
    startAt: null,
    endAt: null,
    choices: activeChoices.map((c, i) => ({
      id: randomUUID(),
      label: c.label,
      position: i,
      ...(c.color ? { color: c.color } : {})
    })),
    invitedVoterList,
    bannedVoterList: isInvitationOnly(source) ? [...source.bannedVoterList] : [],
    currentVotes: invitedVoterList.map((emailAddress) => ({
      emailAddress,
      userName: "",
      choiceIds: [],
      votedAt: null
    })),
    pollStateBeforeEditUpdate: null,
    pollEditUpdateHeartbeatTimestamp: null,
    pollEditUpdateClientGUID: null,
    pollApprovalTimestamp: null,
    pollAcceptabilityScreeningAttempts: 0,
    pollRejectionReason: null,
    timeZone: null,
    lineGraphEnabled: false
  };
}

/**
 * 005-admin-page-improvements FR-001/002: `baseTitle + " Copy"`, or the first
 * `baseTitle + " Copy " + N` (N starting at 1) not already in `existingTitles`
 * — pure, so the caller supplies every currently-used matching title (across
 * every poll state, research.md R1) rather than this function querying itself.
 */
export function nextAvailableCopyTitle(baseTitle: string, existingTitles: string[]): string {
  const used = new Set(existingTitles);
  const bare = `${baseTitle} Copy`;
  if (!used.has(bare)) return bare;
  let n = 1;
  while (used.has(`${bare} ${n}`)) n++;
  return `${bare} ${n}`;
}
