import type { ChartLine } from "./polymarketChart.js";

export interface PricePoint {
  t: number;
  p: number;
}

interface HarEntry {
  request?: { method?: string; url?: string };
  response?: { content?: { text?: string; encoding?: string } };
}

function readEntries(harText: string): HarEntry[] {
  let har: unknown;
  try {
    har = JSON.parse(harText);
  } catch {
    throw new Error("is not a HAR file");
  }
  const entries = (har as { log?: { entries?: unknown } } | null)?.log?.entries;
  if (!Array.isArray(entries)) throw new Error("is not a HAR file");
  return entries as HarEntry[];
}

function tokenIdOf(entry: HarEntry): string | null {
  const url = entry.request?.url;
  if (entry.request?.method !== "GET" || typeof url !== "string" || !URL.canParse(url)) return null;
  return new URL(url).searchParams.get("token_id");
}

function isPriceHistoryRequest(entry: HarEntry): boolean {
  const url = entry.request?.url;
  if (entry.request?.method !== "GET" || typeof url !== "string" || !URL.canParse(url)) return false;
  const { pathname, searchParams } = new URL(url);
  return pathname.endsWith("/prices-history") && searchParams.has("token_id");
}

function bodyOf(entry: HarEntry): string | undefined {
  // http://www.softwareishard.com/blog/har-12-spec/#content
  const content = entry.response?.content;
  if (typeof content?.text !== "string") return undefined;
  return content.encoding === "base64" ? Buffer.from(content.text, "base64").toString("utf8") : content.text;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readPoints(entry: HarEntry, label: string): PricePoint[] {
  const history = `history for "${label}"`;
  const body = bodyOf(entry);
  let data: unknown;
  try {
    data = body === undefined ? undefined : (JSON.parse(body) as { data?: unknown } | null)?.data;
  } catch {
    data = undefined;
  }
  if (!Array.isArray(data)) throw new Error(`${history} is not readable`);
  return data.map((item: { timestamp?: unknown; price?: unknown } | null) => {
    const t = item?.timestamp;
    const p = item?.price;
    if (!isNumber(t)) throw new Error(`${history} has a point with no timestamp or a timestamp that is not a number`);
    if (!isNumber(p) || p < 0 || p > 1) throw new Error(`${history} has a price that is not a number from 0 to 1`);
    return { t, p };
  });
}

export function readPriceHistories(harText: string, lines: ChartLine[]): Map<string, PricePoint[]> {
  const labels = new Map(lines.map((line) => [line.tokenId, line.label]));
  const byLine = new Map<string, Map<number, number>>();
  let hasPriceHistory = false;
  for (const entry of readEntries(harText)) {
    hasPriceHistory ||= isPriceHistoryRequest(entry);
    const tokenId = tokenIdOf(entry);
    const label = tokenId === null ? undefined : labels.get(tokenId);
    if (tokenId === null || label === undefined) continue;
    const points = byLine.get(tokenId) ?? new Map<number, number>();
    for (const { t, p } of readPoints(entry, label)) {
      if (!points.has(t)) points.set(t, p);
    }
    byLine.set(tokenId, points);
  }

  const histories = new Map<string, PricePoint[]>();
  for (const line of lines) {
    const points = byLine.get(line.tokenId);
    if (points === undefined || points.size === 0) {
      if (!hasPriceHistory) {
        throw new Error("has no price-history responses; save the HAR with DevTools open on the Network tab before the page loads");
      }
      throw new Error(`has no price history for "${line.label}"`);
    }
    histories.set(
      line.tokenId,
      [...points].map(([t, p]) => ({ t, p })).sort((x, y) => x.t - y.t),
    );
  }
  return histories;
}
