import type { ColumnType, Generated, Insertable, JSONColumnType, Selectable, Updateable } from "kysely";

type Timestamp = ColumnType<Date, Date | string, Date | string>;
type NullableTimestamp = ColumnType<Date | null, Date | string | null, Date | string | null>;

export interface UserTable {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  clientId: string | null;
  clientSecret: string | null;
  userName: string | null;
  profileAvatar: string | null;
  status: string | null;
  permissions: ColumnType<string[], string[] | undefined, string[]>;
  terms_version: string | null;
  terms_accepted_at: NullableTimestamp;
}

export interface SessionTable {
  id: string;
  expiresAt: Timestamp;
  token: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string;
}

export interface AccountTable {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: NullableTimestamp;
  refreshTokenExpiresAt: NullableTimestamp;
  scope: string | null;
  password: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VerificationTable {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Timestamp;
  createdAt: NullableTimestamp;
  updatedAt: NullableTimestamp;
}

export interface RateLimitTable {
  id: string;
  key: string | null;
  count: number | null;
  lastRequest: number | null;
}

export interface EmailChangeRequestTable {
  user_id: string;
  new_email: string;
  old_email: string;
  token_hash: string;
  created_at: Timestamp;
}

export interface PollChoiceJson {
  id: string;
  label: string;
  position: number;
  color?: string;
}

export interface PollTable {
  id: string;
  title: string;
  subtitle: string;
  choices: JSONColumnType<PollChoiceJson[]>;
  choice_labels: string;
  keywords: Generated<string>;
  search: Generated<string>;
  home_listable: Generated<boolean>;
  poll_state: string;
  poll_state_before_edit_update: string | null;
  poll_visibility: string;
  poll_sharing_mode: string;
  vote_anonymity: string;
  choice_mode: string;
  vote_mutability: string;
  voter_count_limit: number | null;
  created_by_id: string;
  created_by_name: string;
  created_at: Timestamp;
  start_at: NullableTimestamp;
  end_at: NullableTimestamp;
  closed_at: NullableTimestamp;
  launched_at: NullableTimestamp;
  last_vote_at: NullableTimestamp;
  vote_count: Generated<number>;
  invited_count: Generated<number>;
  banned_count: Generated<number>;
  choice_counts: ColumnType<Record<string, number>, string | undefined, string>;
  content_version: Generated<number>;
  counts_version: Generated<number>;
  poll_edit_update_heartbeat_timestamp: NullableTimestamp;
  poll_edit_update_client_guid: string | null;
  poll_approval_timestamp: NullableTimestamp;
  poll_acceptability_screening_attempts: Generated<number>;
  poll_rejection_reason: string | null;
  ever_voted: Generated<boolean>;
  time_zone: ColumnType<string | null, string | null | undefined, string | null>;
}

export interface VoteTable {
  poll_id: string;
  email: string;
  user_name: string;
  choice_ids: string[];
  voted_at: NullableTimestamp;
}

export interface VoteHistoryTable {
  id: Generated<number>;
  poll_id: string;
  email: string;
  user_name: string;
  choice_ids: string[];
  voted_at: Timestamp;
}

/** Per poll, hour and choice, how much the count changed; TALLY_VOTERS ("") counts addresses. */
export interface LineGraphTallyTable {
  poll_id: string;
  hour: Timestamp;
  choice_id: string;
  delta: number;
}

/** Each address's latest vote_history selection on a poll. */
export interface LineGraphSelectionTable {
  poll_id: string;
  email: string;
  choice_ids: string[];
  voted_at: Timestamp;
}

export interface PollInvitationTable {
  poll_id: string;
  email: string;
  position: Generated<number>;
  added_at: Generated<Date>;
  sent_at: NullableTimestamp;
  reminded_at: NullableTimestamp;
  send_failed_at: NullableTimestamp;
  accepted_at: NullableTimestamp;
  token_hash: string | null;
  token_expires_at: NullableTimestamp;
  token_used_at: NullableTimestamp;
}

export interface InvitationEmailTable {
  creator_id: string;
  sent_at: Generated<Date>;
}

export interface InvitationHistoryTable {
  poll_id: string;
  email_key: string;
  sent_at: NullableTimestamp;
  reminded_at: NullableTimestamp;
}

export interface PollBanTable {
  poll_id: string;
  email: string;
  position: Generated<number>;
}

export interface BookmarkTable {
  email: string;
  poll_id: string;
  created_at: Generated<Date>;
}

export type UserPollRelation = "created" | "invited" | "voted" | "bookmarked" | "linked";

export interface UserPollTable {
  email: string;
  poll_id: string;
  relation: UserPollRelation;
  updated_at: Timestamp;
}

export interface SearchOutboxTable {
  poll_id: string;
  version: number;
  reason: "content" | "counters";
}

export interface Database {
  user: UserTable;
  session: SessionTable;
  account: AccountTable;
  verification: VerificationTable;
  rateLimit: RateLimitTable;
  email_change_requests: EmailChangeRequestTable;
  polls: PollTable;
  votes: VoteTable;
  vote_history: VoteHistoryTable;
  line_graph_tally: LineGraphTallyTable;
  line_graph_selection: LineGraphSelectionTable;
  poll_invitations: PollInvitationTable;
  invitation_emails: InvitationEmailTable;
  invitation_history: InvitationHistoryTable;
  poll_bans: PollBanTable;
  bookmarks: BookmarkTable;
  user_polls: UserPollTable;
  search_outbox: SearchOutboxTable;
}

export type PollRow = Selectable<PollTable>;
export type NewPollRow = Insertable<PollTable>;
export type PollRowUpdate = Updateable<PollTable>;
export type VoteRow = Selectable<VoteTable>;
export type NewVoteRow = Insertable<VoteTable>;
export type NewVoteHistoryRow = Insertable<VoteHistoryTable>;
