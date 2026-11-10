import { sql } from "kysely";
import type { PollRow } from "../db/schema.js";
import type { Db } from "./store.js";

export interface VoterEntry {
  name: string;
  choiceIds: string[];
  votedAt: string;
}

export interface VoterReport {
  voters: VoterEntry[];
  counted: number;
}

export async function readVoterReport(db: Db, row: Pick<PollRow, "id" | "choices">): Promise<VoterReport> {
  const rows = await db
    .selectFrom("votes")
    .select(["user_name", "choice_ids", "voted_at"])
    .where("poll_id", "=", row.id)
    .where(sql<boolean>`cardinality(choice_ids) > 0`)
    .orderBy("user_name")
    .orderBy("voted_at")
    .execute();
  const pollChoiceIds = new Set(row.choices.map((choice) => choice.id));
  const voters = rows
    .map((vote) => ({
      name: vote.user_name,
      choiceIds: vote.choice_ids.filter((id) => pollChoiceIds.has(id)),
      votedAt: new Date(vote.voted_at ?? 0).toISOString()
    }))
    .filter((voter) => voter.choiceIds.length > 0);
  return { voters, counted: rows.length };
}
