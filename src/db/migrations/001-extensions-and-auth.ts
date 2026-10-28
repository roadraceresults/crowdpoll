import { sql, type Kysely } from "kysely";

// The auth tables are the output of BetterAuth's migration generator for the
// Kysely/PostgreSQL adapter with this application's additional user fields
// (`npx @better-auth/cli generate`). https://www.better-auth.com/docs/concepts/database
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`.execute(db);

  await sql`create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null, "clientId" text, "clientSecret" text, "userName" text, "profileAvatar" text, "status" text)`.execute(db);
  await sql`create table "session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade)`.execute(db);
  await sql`create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null)`.execute(db);
  await sql`create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null)`.execute(db);
  await sql`create table "rateLimit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null)`.execute(db);
  await sql`create index "session_userId_idx" on "session" ("userId")`.execute(db);
  await sql`create index "account_userId_idx" on "account" ("userId")`.execute(db);
  await sql`create index "verification_identifier_idx" on "verification" ("identifier")`.execute(db);

  await sql`create unique index "user_userName_ci_unique" on "user" (lower("userName"))`.execute(db);
  await sql`create index "verification_value_email_idx" on "verification" (left("value", 260))`.execute(db);

  await sql`create table "email_change_requests" ("user_id" text not null references "user" ("id") on delete cascade, "new_email" text not null, "old_email" text not null, "token_hash" text not null, "created_at" timestamptz default CURRENT_TIMESTAMP not null)`.execute(db);
  await sql`create index "email_change_requests_user_id_idx" on "email_change_requests" ("user_id")`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`drop table if exists "email_change_requests"`.execute(db);
  await sql`drop table if exists "rateLimit"`.execute(db);
  await sql`drop table if exists "verification"`.execute(db);
  await sql`drop table if exists "account"`.execute(db);
  await sql`drop table if exists "session"`.execute(db);
  await sql`drop table if exists "user"`.execute(db);
}
