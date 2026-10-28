import type { LiveCounts } from "../polls/counters.js";
import type { OverlayEntry } from "../polls/userPolls.js";
import type { PollProjection } from "../polls/versions.js";

/** What the client holds: `[contentVersion, countsVersion]` per poll. */
export interface ClientVersions {
  membershipVersion: string | null;
  versions: Record<string, [number, number]>;
}

export interface CurrentListing {
  membershipVersion: string | null;
  order: string[];
  projections: Map<string, PollProjection | PlaceholderCard>;
  counts: Map<string, LiveCounts>;
  overlay?: Record<string, OverlayEntry & { voteBlockedReason?: string | null }>;
}

/** What a listing sends in place of a poll its viewer may not read yet: who shared it, and nothing else. */
export interface PlaceholderCard {
  pid: string;
  notPublished: true;
  createdByName: string;
  contentVersion: number;
}

export type Card = (PollProjection & { overlay?: OverlayEntry & { voteBlockedReason?: string | null } }) | PlaceholderCard;

export interface DeltaBody {
  membershipVersion: string | null;
  order?: string[];
  counters: Record<string, LiveCounts>;
  cards: Record<string, Card>;
}

export type Delta = { status: 304 } | { status: 200; body: DeltaBody };

export function parseClientVersions(body: unknown): ClientVersions {
  const raw = (body ?? {}) as { membershipVersion?: unknown; versions?: unknown };
  const versions: Record<string, [number, number]> = {};
  if (raw.versions && typeof raw.versions === "object") {
    for (const [pid, pair] of Object.entries(raw.versions as Record<string, unknown>)) {
      if (Array.isArray(pair) && pair.length === 2) versions[pid] = [Number(pair[0]) || 0, Number(pair[1]) || 0];
    }
  }
  return {
    membershipVersion: typeof raw.membershipVersion === "string" ? raw.membershipVersion : null,
    versions
  };
}

const EMPTY_COUNTS: LiveCounts = { voteCount: 0, choiceCounts: {}, countsVersion: 0 };

/** Only what moved travels: nothing (304), counters, whole cards, or the order with the cards the client lacks. */
export function computeDelta(request: ClientVersions, current: CurrentListing): Delta {
  const held = new Set(Object.keys(request.versions));
  const membershipMoved =
    request.membershipVersion !== current.membershipVersion ||
    current.order.length !== held.size ||
    current.order.some((pid) => !held.has(pid));

  const counters: Record<string, LiveCounts> = {};
  const cards: Record<string, Card> = {};
  for (const pid of current.order) {
    const projection = current.projections.get(pid);
    if (!projection) continue;
    if ("notPublished" in projection) {
      const known = request.versions[pid];
      if (!known || known[0] !== projection.contentVersion) cards[pid] = { ...projection };
      continue;
    }
    const counts = current.counts.get(pid) ?? EMPTY_COUNTS;
    const known = request.versions[pid];
    const contentMoved = !known || known[0] !== projection.contentVersion;
    const countsMoved = !known || counts.countsVersion > known[1];
    if (contentMoved) {
      const overlay = current.overlay?.[pid];
      cards[pid] = overlay ? { ...projection, overlay } : { ...projection };
    }
    if (contentMoved || countsMoved) counters[pid] = counts;
  }

  if (!membershipMoved && Object.keys(cards).length === 0 && Object.keys(counters).length === 0) {
    return { status: 304 };
  }
  const body: DeltaBody = { membershipVersion: current.membershipVersion, counters, cards };
  if (membershipMoved) body.order = current.order;
  return { status: 200, body };
}
