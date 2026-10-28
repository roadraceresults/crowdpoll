import { sql, type Kysely } from "kysely";
import type { Database, PollRow } from "../db/schema.js";

export type DayOperator = "gte" | "lte" | "eq";
export type CountOperator = "gte" | "lte" | "eq";

export interface DayFilter {
  op: DayOperator;
  day: string;
}

export interface CountFilter {
  op: CountOperator;
  n: number;
}

export interface AdminSearchFilters {
  q?: string;
  state?: string;
  visibility?: string;
  choiceMode?: string;
  voteMutability?: string;
  createdBy?: string;
  createdAt?: DayFilter;
  startAt?: DayFilter;
  endAt?: DayFilter;
  tz?: string;
  voteCount?: CountFilter;
  invitedVoterCount?: CountFilter;
  bannedVoterCount?: CountFilter;
}

export class AdminSearchError extends Error {}

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The UTC instant at which a calendar day begins in an IANA zone. */
export function dayStartUtc(day: string, tz: string): Date {
  const match = DAY_RE.exec(day);
  if (!match) throw new AdminSearchError(`Invalid day "${day}"; expected YYYY-MM-DD.`);
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  } catch {
    throw new AdminSearchError(`Unknown time zone "${tz}".`);
  }
  // Start from the UTC midnight, read what wall-clock time that is in the zone, and
  // shift by the difference; a second pass absorbs a DST change on that day.
  let guess = Date.UTC(y, m - 1, d, 0, 0, 0);
  for (let pass = 0; pass < 2; pass++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
    const wall = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    const offset = wall - guess;
    const target = Date.UTC(y, m - 1, d, 0, 0, 0);
    guess = target - offset;
  }
  return new Date(guess);
}

/** The half-open UTC window `[from, to)` a day filter denotes in the administrator's zone. */
export function dayWindow(filter: DayFilter, tz: string): { from: Date | null; to: Date | null } {
  const start = dayStartUtc(filter.day, tz);
  const [y, m, d] = filter.day.split("-").map(Number) as [number, number, number];
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
  const end = dayStartUtc(nextDay.toISOString().slice(0, 10), tz);
  if (filter.op === "eq") return { from: start, to: end };
  if (filter.op === "gte") return { from: start, to: null };
  return { from: null, to: end };
}

function parseDay(raw: unknown): DayFilter | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const [op, day] = raw.split(":");
  if (op !== "gte" && op !== "lte" && op !== "eq") throw new AdminSearchError(`Invalid date operator "${op}".`);
  if (!day || !DAY_RE.test(day)) throw new AdminSearchError(`Invalid day "${day ?? ""}"; expected YYYY-MM-DD.`);
  return { op, day };
}

function parseCount(raw: unknown): CountFilter | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const [op, value] = raw.split(":");
  if (op !== "gte" && op !== "lte" && op !== "eq") throw new AdminSearchError(`Invalid count operator "${op}".`);
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new AdminSearchError(`Invalid count "${value ?? ""}".`);
  return { op, n };
}

const text = (raw: unknown): string | undefined => (typeof raw === "string" && raw.trim() !== "" ? raw.trim() : undefined);

/** Reads the query string of GET /api/admin/polls/search; blanks are ignored. */
export function parseAdminSearch(query: Record<string, unknown>): AdminSearchFilters {
  const filters: AdminSearchFilters = {
    q: text(query.q),
    state: text(query.state),
    visibility: text(query.visibility),
    choiceMode: text(query.choiceMode),
    voteMutability: text(query.voteMutability),
    createdBy: text(query.createdBy),
    createdAt: parseDay(query.createdAt),
    startAt: parseDay(query.startAt),
    endAt: parseDay(query.endAt),
    tz: text(query.tz),
    voteCount: parseCount(query.voteCount),
    invitedVoterCount: parseCount(query.invitedVoterCount),
    bannedVoterCount: parseCount(query.bannedVoterCount)
  };
  if ((filters.createdAt || filters.startAt || filters.endAt) && !filters.tz) {
    throw new AdminSearchError("tz is required when a date filter is set.");
  }
  return filters;
}

const COUNT_OPS = { gte: ">=", lte: "<=", eq: "=" } as const;

/** The one statement behind the administrator's search: every control ANDed, newest first. */
export function adminSearchQuery(db: Kysely<Database>, filters: AdminSearchFilters, cap: number) {
  let query = db.selectFrom("polls").selectAll();
  if (filters.q) query = query.where(sql<boolean>`search @@ websearch_to_tsquery('english', ${filters.q})`);
  if (filters.state) query = query.where("poll_state", "=", filters.state);
  if (filters.visibility) query = query.where("poll_visibility", "=", filters.visibility);
  if (filters.choiceMode) query = query.where("choice_mode", "=", filters.choiceMode);
  if (filters.voteMutability) query = query.where("vote_mutability", "=", filters.voteMutability);
  if (filters.createdBy) {
    query = query.where("created_by_name", "ilike", `%${filters.createdBy.replace(/[\\%_]/g, "\\$&")}%`);
  }
  const tz = filters.tz ?? "UTC";
  for (const [column, filter] of [
    ["created_at", filters.createdAt],
    ["start_at", filters.startAt],
    ["end_at", filters.endAt]
  ] as const) {
    if (!filter) continue;
    const { from, to } = dayWindow(filter, tz);
    if (from) query = query.where(column, ">=", from);
    if (to) query = query.where(column, "<", to);
  }
  for (const [column, filter] of [
    ["vote_count", filters.voteCount],
    ["invited_count", filters.invitedVoterCount],
    ["banned_count", filters.bannedVoterCount]
  ] as const) {
    if (filter) query = query.where(column, COUNT_OPS[filter.op], filter.n);
  }
  return query.orderBy("created_at", "desc").orderBy("id", "desc").limit(cap + 1);
}

export async function adminSearch(
  db: Kysely<Database>,
  filters: AdminSearchFilters,
  cap: number
): Promise<{ rows: PollRow[]; truncated: boolean }> {
  const rows = await adminSearchQuery(db, filters, cap).execute();
  return { rows: rows.slice(0, cap), truncated: rows.length > cap };
}
