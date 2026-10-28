import { Client } from "@opensearch-project/opensearch";
import type { Search_RequestBody } from "@opensearch-project/opensearch/api/index.js";
import type { PollRow } from "../db/schema.js";
import type { SearchEngine, SearchHit } from "./search.js";

export const POLLS_INDEX = "polls";
const HEALTH_CACHE_MS = 5000;

export interface PollDocument {
  pid: string;
  title: string;
  subtitle: string;
  choice_labels: string;
  keywords: string;
  vote_count: number;
  created_at: string;
  content_version: number;
  counts_version: number;
}

export function toDocument(row: PollRow): PollDocument {
  return {
    pid: row.id,
    title: row.title,
    subtitle: row.subtitle,
    choice_labels: row.choice_labels,
    keywords: row.keywords,
    vote_count: row.vote_count,
    created_at: new Date(row.created_at).toISOString(),
    content_version: row.content_version,
    counts_version: row.counts_version
  };
}

export interface OpenSearchEngine extends SearchEngine {
  ensureIndex(): Promise<void>;
  healthy(): Promise<boolean>;
  bulk(upserts: PollDocument[], deletes: string[]): Promise<void>;
}

// Client and query DSL: https://opensearch.org/docs/latest/clients/javascript/index/
export function createOpenSearch(url: string): OpenSearchEngine {
  const client = new Client({ node: url });
  let health: { at: number; ok: boolean } | null = null;

  const mapping = {
    settings: { index: { number_of_shards: 1, number_of_replicas: 1 } },
    mappings: {
      properties: {
        pid: { type: "keyword" as const },
        title: { type: "text" as const, analyzer: "english" },
        subtitle: { type: "text" as const, analyzer: "english" },
        choice_labels: { type: "text" as const, analyzer: "english" },
        keywords: { type: "text" as const, analyzer: "english" },
        vote_count: { type: "integer" as const },
        created_at: { type: "date" as const },
        content_version: { type: "long" as const },
        counts_version: { type: "long" as const }
      }
    }
  };

  function pass(text: string, variant: "and" | "or" | "fuzzy", size: number): Search_RequestBody {
    const multiMatch: Record<string, unknown> = {
      query: text,
      fields: ["title^4", "subtitle^3", "choice_labels^2", "keywords"]
    };
    if (variant === "and") multiMatch.minimum_should_match = "100%";
    if (variant === "or") multiMatch.minimum_should_match = "1";
    if (variant === "fuzzy") multiMatch.fuzziness = "AUTO";
    return {
      size,
      _source: ["pid"],
      query: {
        function_score: {
          query: { multi_match: multiMatch },
          functions: [
            { field_value_factor: { field: "vote_count", modifier: "log1p", missing: 0 } },
            { gauss: { created_at: { origin: "now", scale: "30d", decay: 0.5 } } }
          ],
          score_mode: "multiply",
          boost_mode: "multiply"
        }
      }
    } as Search_RequestBody;
  }

  return {
    name: "opensearch",
    async ensureIndex() {
      const exists = await client.indices.exists({ index: POLLS_INDEX });
      if (!exists.body) {
        await client.indices.create({ index: POLLS_INDEX, body: mapping });
        console.log(`[search] Created the OpenSearch index "${POLLS_INDEX}"`);
      }
    },
    async healthy() {
      if (health && Date.now() - health.at < HEALTH_CACHE_MS) return health.ok;
      let ok = false;
      try {
        const res = await client.cluster.health({ timeout: "1s" });
        const status = (res.body as { status?: string }).status;
        ok = status === "green" || status === "yellow";
      } catch (err) {
        console.error(`[search] OpenSearch health probe failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (!ok && (!health || health.ok)) console.log("[search] PostgreSQL full-text search is serving");
      if (ok && health && !health.ok) console.log("[search] OpenSearch is serving again");
      health = { at: Date.now(), ok };
      return ok;
    },
    async query(_scope, text, limit) {
      const seen = new Set<string>();
      const hits: SearchHit[] = [];
      for (const variant of ["and", "or", "fuzzy"] as const) {
        if (hits.length >= limit) break;
        const res = await client.search({ index: POLLS_INDEX, body: pass(text, variant, limit) });
        const found = (res.body as unknown as { hits: { hits: { _source?: { pid: string } }[] } }).hits.hits;
        for (const hit of found) {
          const pid = hit._source?.pid;
          if (!pid) continue;
          if (seen.has(pid) || hits.length >= limit) continue;
          seen.add(pid);
          hits.push({ pid });
        }
      }
      return hits;
    },
    async bulk(upserts, deletes) {
      const body: Record<string, unknown>[] = [];
      for (const doc of upserts) body.push({ index: { _index: POLLS_INDEX, _id: doc.pid } }, { ...doc });
      for (const pid of deletes) body.push({ delete: { _index: POLLS_INDEX, _id: pid } });
      if (body.length === 0) return;
      const res = await client.bulk({ refresh: false, body });
      if ((res.body as { errors?: boolean }).errors) console.error("[search] Some bulk index operations failed");
    }
  };
}
