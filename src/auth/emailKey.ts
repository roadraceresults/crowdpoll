import { sql, type RawBuilder } from "kysely";

export function emailKey(address: RawBuilder<unknown> | string): RawBuilder<string> {
  const local = sql`split_part(split_part(${address}, '@', 1), '+', 1)`;
  const domain = sql`split_part(${address}, '@', 2)`;
  return sql<string>`(case when ${domain} in ('gmail.com', 'googlemail.com') then replace(${local}, '.', '') || '@gmail.com' else ${local} || '@' || ${domain} end)`;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailKeyOf(address: string): string {
  const at = address.indexOf("@");
  const local = (at < 0 ? address : address.slice(0, at)).split("+")[0]!;
  const domain = at < 0 ? "" : address.slice(at + 1).split("@")[0]!;
  return domain === "gmail.com" || domain === "googlemail.com"
    ? `${local.replace(/\./g, "")}@gmail.com`
    : `${local}@${domain}`;
}
