import * as cheerio from "cheerio";
import { EASTERN_DATE, type GraphFile } from "./extractLineGraph.js";
import { ExtractError, type GraphInput, type GraphResult } from "./graphExtraction.js";
import { normalizeTitle } from "./normalizeTitle.js";
import { percentOf } from "./polymarketGraph.js";

interface Market {
  name: string;
  bestAsk: unknown;
}

export interface PolymarketEvent {
  title: string;
  markets: Market[];
}

const PUSH = /^\s*self\.__next_f\.push\(([\s\S]*)\)\s*;?\s*$/;
const LINE = /^[0-9a-f]+:([\s\S]*)$/;
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const MAX_OUTCOMES = 50;
const CENTS = /(?<![<\d.])(\d+(?:\.\d+)?)\s*¢/;

function payloadOf($: cheerio.CheerioAPI): string {
  const chunks: string[] = [];
  for (const script of $("script").toArray()) {
    const push = PUSH.exec($(script).text());
    if (push === null) continue;
    try {
      const entry: unknown = JSON.parse(push[1]!);
      if (Array.isArray(entry) && typeof entry[1] === "string") chunks.push(entry[1]);
    } catch {
      continue;
    }
  }
  return chunks.join("");
}

function parsedLines(payload: string): unknown[] {
  const values: unknown[] = [];
  for (const line of payload.split("\n")) {
    const match = LINE.exec(line);
    if (match === null) continue;
    try {
      values.push(JSON.parse(match[1]!));
    } catch {
      continue;
    }
  }
  return values;
}

function marketOf(value: unknown): Market {
  const market = (typeof value === "object" && value !== null ? value : {}) as { groupItemTitle?: unknown; bestAsk?: unknown };
  return { name: typeof market.groupItemTitle === "string" ? market.groupItemTitle.trim() : "", bestAsk: market.bestAsk };
}

function collectEvents(value: unknown, events: PolymarketEvent[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectEvents(item, events);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  const { title, markets } = value as { title?: unknown; markets?: unknown };
  if (typeof title === "string" && Array.isArray(markets)) {
    events.push({ title, markets: markets.map(marketOf) });
    return;
  }
  for (const child of Object.values(value)) collectEvents(child, events);
}

function eventsOf($: cheerio.CheerioAPI): PolymarketEvent[] {
  const events: PolymarketEvent[] = [];
  for (const value of parsedLines(payloadOf($))) collectEvents(value, events);
  return events;
}

export function readPolymarketEvents(html: string): PolymarketEvent[] {
  return eventsOf(cheerio.load(html));
}

// A page saved after moving to another event within Polymarket still carries the first event's data,
// so the event in its heading is read from the drawn rows: each Buy Yes button names its row by aria-labelledby.
function renderedEvent($: cheerio.CheerioAPI, graphTitle: string): PolymarketEvent | undefined {
  const title = $("h1").toArray().map((heading) => $(heading).text().trim()).find((text) => normalizeTitle(text) === normalizeTitle(graphTitle));
  if (title === undefined) return undefined;
  const markets: Market[] = [];
  for (const button of $("button[aria-labelledby]").toArray()) {
    const text = $(button).text().trim();
    if (!text.startsWith("Buy Yes")) continue;
    const nameId = ($(button).attr("aria-labelledby") ?? "").trim().split(/\s+/).at(-1) ?? "";
    const name = $("[id]").filter((_, element) => $(element).attr("id") === nameId).first().text().trim();
    const cents = CENTS.exec(text);
    markets.push({ name, bestAsk: cents === null ? undefined : Number(cents[1]) / 100 });
  }
  return markets.length > 0 ? { title, markets } : undefined;
}

function letterOf(index: number): string {
  return index < LETTERS.length ? LETTERS[index]! : LETTERS[Math.floor(index / LETTERS.length) - 1]! + LETTERS[index % LETTERS.length]!;
}

function valueOf(bestAsk: unknown): number {
  return typeof bestAsk === "number" && Number.isFinite(bestAsk) ? percentOf(bestAsk) : 0;
}

export async function extractYesNo(input: GraphInput): Promise<GraphResult> {
  const { graphTitle, inputHtml, html } = input;
  const $ = cheerio.load(html);
  const events = eventsOf($).filter((event) => event.markets.length > 0);
  const event = events.find((candidate) => normalizeTitle(candidate.title) === normalizeTitle(graphTitle)) ?? renderedEvent($, graphTitle);
  if (event === undefined) {
    if (events.length === 0) throw new ExtractError(`no Polymarket yes/no table found in ${inputHtml}`);
    throw new ExtractError(`graph ${JSON.stringify(graphTitle)} not found in ${inputHtml}; the page's event is ${JSON.stringify(events[0]!.title)}`);
  }
  if (event.markets.length > MAX_OUTCOMES) throw new ExtractError(`page ${inputHtml}: has more than ${MAX_OUTCOMES} outcomes`);

  const point: GraphFile["data_points"][number] = { date: EASTERN_DATE.format(new Date()) };
  const graph: GraphFile = { graph_title: event.title, data_points: [point] };
  event.markets.forEach((market, index) => {
    if (market.name === "") throw new ExtractError(`page ${inputHtml}: outcome ${index + 1} has no name`);
    graph[`label_${letterOf(index)}`] = market.name;
    point[letterOf(index)] = valueOf(market.bestAsk);
  });
  return { graph, warnings: [] };
}
