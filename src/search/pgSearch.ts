import { sql } from "kysely";
import type { Db } from "../db/client.js";
import type { SearchEngine, SearchHit } from "./search.js";

const NEWEST_BOUND = 5000;
const TYPO_MIN_LENGTH = 3;

function orQuery(text: string): string {
  const words = text.match(/[\p{L}\p{N}]+/gu) ?? [];
  return words.map((w) => w.replace(/'/g, "''")).join(" | ");
}

// Full-text search: https://www.postgresql.org/docs/16/textsearch-controls.html
// Trigram similarity (the % operator uses pg_trgm.similarity_threshold, 0.3 by
// default, and is what the trigram index serves): https://www.postgresql.org/docs/16/pgtrgm.html
export function passQuery(condition: ReturnType<typeof sql>, rankBy: ReturnType<typeof sql>, limit: number) {
  return sql<{ id: string }>`
    with newest as (
      select id, search, title, vote_count, created_at
      from polls
      where home_listable and ${condition}
      order by created_at desc, id desc
      limit ${NEWEST_BOUND}
    )
    select id from newest
    order by ${rankBy} desc, vote_count desc, created_at desc
    limit ${limit}`;
}

export function searchPasses(text: string, limit: number) {
  const disjunction = orQuery(text);
  return {
    and: passQuery(
      sql`search @@ websearch_to_tsquery('english', ${text})`,
      sql`ts_rank_cd(search, websearch_to_tsquery('english', ${text}))`,
      limit
    ),
    or: disjunction
      ? passQuery(
          sql`search @@ to_tsquery('english', ${disjunction})`,
          sql`ts_rank_cd(search, to_tsquery('english', ${disjunction}))`,
          limit
        )
      : null,
    typo: text.length >= TYPO_MIN_LENGTH ? passQuery(sql`title % ${text}`, sql`similarity(title, ${text})`, limit) : null
  };
}

export function createPgSearch(db: Db): SearchEngine {
  async function run(pass: ReturnType<typeof passQuery>): Promise<string[]> {
    const { rows } = await pass.execute(db);
    return rows.map((r) => r.id);
  }

  return {
    name: "postgres",
    async query(_scope, text, limit) {
      const seen = new Set<string>();
      const hits: SearchHit[] = [];
      const add = (ids: string[]) => {
        for (const id of ids) {
          if (hits.length >= limit) break;
          if (seen.has(id)) continue;
          seen.add(id);
          hits.push({ pid: id });
        }
      };

      const passes = searchPasses(text, limit);
      add(await run(passes.and));
      if (hits.length < limit && passes.or) add(await run(passes.or));
      if (hits.length < limit && passes.typo) add(await run(passes.typo));
      return hits;
    }
  };
}
