import { CompiledQuery, type Kysely } from "kysely";
import type { Database } from "../../src/db/schema.js";

export interface PlanNode {
  "Node Type": string;
  "Relation Name"?: string;
  "Plan Rows"?: number;
  Plans?: PlanNode[];
}

interface ExplainRow {
  "QUERY PLAN": [{ Plan: PlanNode }];
}

function walk(node: PlanNode, into: PlanNode[]): PlanNode[] {
  into.push(node);
  for (const child of node.Plans ?? []) walk(child, into);
  return into;
}

/** Every node of the plan PostgreSQL chooses for a Kysely query (EXPLAIN (FORMAT JSON)). */
export async function planNodes(query: {
  explain<T>(format: "json"): Promise<T[]>;
}): Promise<PlanNode[]> {
  const rows = await query.explain<ExplainRow>("json");
  return walk(rows[0]!["QUERY PLAN"][0].Plan, []);
}

/** The same for a raw SQL statement: prefixes EXPLAIN and keeps the bound parameters. */
export async function planNodesOfSql(
  db: Kysely<Database>,
  statement: { compile(db: Kysely<Database>): CompiledQuery }
): Promise<PlanNode[]> {
  const compiled = statement.compile(db);
  const explained = CompiledQuery.raw(`explain (format json) ${compiled.sql}`, [...compiled.parameters]);
  const result = await db.executeQuery<ExplainRow>(explained);
  return walk(result.rows[0]!["QUERY PLAN"][0].Plan, []);
}

export function seqScansOfPolls(nodes: PlanNode[]): PlanNode[] {
  return nodes.filter((n) => n["Node Type"] === "Seq Scan" && n["Relation Name"] === "polls");
}

/**
 * Sequential scans that read history rows (an empty next-month partition is scanned
 * for its one estimated row and does not count), and any parallel (Gather) node.
 */
export function fullScansOfVoteHistory(nodes: PlanNode[]): PlanNode[] {
  return nodes.filter(
    (n) =>
      (n["Node Type"] === "Seq Scan" && (n["Relation Name"] ?? "").startsWith("vote_history") && (n["Plan Rows"] ?? 0) > 10) ||
      n["Node Type"].startsWith("Gather")
  );
}
