import { createHash } from "node:crypto";
import type { Cache } from "../cache/cache.js";
import type { AppConfig } from "../config.js";
import type { Db } from "../db/client.js";
import type { PollRow } from "../db/schema.js";
import { createPgSearch } from "./pgSearch.js";
import { createOpenSearch, type OpenSearchEngine } from "./openSearch.js";

export type SearchScope = "home";

export interface SearchHit {
  pid: string;
}

export interface SearchEngine {
  readonly name: "opensearch" | "postgres";
  /** Up to `limit` matching poll ids, best first; `limit` is the cap plus one so the caller sees truncation. */
  query(scope: SearchScope, text: string, limit: number): Promise<SearchHit[]>;
}

export interface SearchResult {
  rows: PollRow[];
  truncated: boolean;
  /** Whether the engine was queried (a cache hit costs no engine query). */
  fromCache: boolean;
}

export interface Search {
  search(scope: SearchScope, text: string, limit: number): Promise<SearchResult>;
  /** Which engine answers the next query — OpenSearch when configured and healthy. */
  servingEngine(): Promise<SearchEngine["name"]>;
  openSearch: OpenSearchEngine | null;
}

export function normaliseQuery(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
}

export function searchCacheKey(scope: SearchScope, normalised: string): string {
  return `search:${createHash("sha256").update(`${normalised}\n${scope}`).digest("hex")}`;
}

export interface SearchDeps {
  db: Db;
  cache: Cache;
  config: Pick<AppConfig, "openSearchUrl" | "searchCacheTtlMs">;
  onEngineQuery?: () => Promise<void>;
  /** A prepared engine in place of the one built from `ENV_OPENSEARCH_URL`. */
  openSearch?: OpenSearchEngine;
}

export function createSearch({ db, cache, config, onEngineQuery, openSearch: prepared }: SearchDeps): Search {
  const postgres = createPgSearch(db);
  const openSearch = prepared ?? (config.openSearchUrl ? createOpenSearch(config.openSearchUrl) : null);

  async function engine(): Promise<SearchEngine> {
    if (openSearch && (await openSearch.healthy())) return openSearch;
    return postgres;
  }

  async function rowsFor(hits: SearchHit[]): Promise<PollRow[]> {
    if (hits.length === 0) return [];
    const rows = await db
      .selectFrom("polls")
      .selectAll()
      .where("id", "in", hits.map((h) => h.pid))
      .where("home_listable", "=", true)
      .execute();
    const byId = new Map(rows.map((r) => [r.id, r]));
    return hits.map((h) => byId.get(h.pid)).filter((r): r is PollRow => r !== undefined);
  }

  return {
    openSearch,
    servingEngine: async () => (await engine()).name,
    async search(scope, text, limit) {
      const normalised = normaliseQuery(text);
      if (!normalised) return { rows: [], truncated: false, fromCache: true };
      const key = searchCacheKey(scope, normalised);
      const cached = await cache.get(key);
      if (cached) {
        const { pids, truncated } = JSON.parse(cached) as { pids: string[]; truncated: boolean };
        return { rows: await rowsFor(pids.map((pid) => ({ pid }))), truncated, fromCache: true };
      }
      if (onEngineQuery) await onEngineQuery();
      let hits: SearchHit[];
      const chosen = await engine();
      try {
        hits = await chosen.query(scope, normalised, limit + 1);
      } catch (err) {
        if (chosen.name === "opensearch") {
          console.error("[search] OpenSearch query failed; answering from PostgreSQL:", err);
          hits = await postgres.query(scope, normalised, limit + 1);
        } else {
          throw err;
        }
      }
      const truncated = hits.length > limit;
      const kept = hits.slice(0, limit);
      await cache.set(key, JSON.stringify({ pids: kept.map((h) => h.pid), truncated }), config.searchCacheTtlMs);
      return { rows: await rowsFor(kept), truncated, fromCache: false };
    }
  };
}
