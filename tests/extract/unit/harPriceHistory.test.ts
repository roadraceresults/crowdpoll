import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readPriceHistories } from "../../../devScripts/extract/harPriceHistory.js";

const fixturePath = fileURLToPath(new URL("../fixtures/polymarket.har", import.meta.url));
const FIXTURE = fs.readFileSync(fixturePath, "utf8");
const LINES = [
  { label: "Alpha", tokenId: "111" },
  { label: "Beta", tokenId: "222" },
  { label: "Gamma", tokenId: "333" },
];

describe("readPriceHistories", () => {
  it("reads each line's history by its token id", () => {
    const histories = readPriceHistories(FIXTURE, LINES);
    expect([...histories.keys()]).toEqual(["111", "222", "333"]);
    expect(histories.get("222")).toEqual([
      { t: 1780617600, p: 0.11 },
      { t: 1780682400, p: 0.12 },
    ]);
    expect(histories.get("333")).toEqual([
      { t: 1780660800, p: 0.09 },
      { t: 1780833600, p: 0.0125 },
    ]);
  });

  it("combines a line's responses, keeping the first point for a repeated timestamp", () => {
    expect(readPriceHistories(FIXTURE, LINES).get("111")).toEqual([
      { t: 1780617600, p: 0.585 },
      { t: 1780660800, p: 0.6 },
      { t: 1780704000, p: 0.61 },
      { t: 1780833600, p: 0.62 },
    ]);
  });

  it("ignores histories of lines the chart does not draw", () => {
    expect(readPriceHistories(FIXTURE, LINES).has("999")).toBe(false);
  });

  it("ignores the browser's OPTIONS pre-flight requests, which have no body", () => {
    const har = JSON.parse(FIXTURE);
    har.log.entries = har.log.entries.filter((entry: { request: { method: string } }) => entry.request.method !== "OPTIONS");
    expect(readPriceHistories(FIXTURE, LINES)).toEqual(readPriceHistories(JSON.stringify(har), LINES));
  });
});

describe("readPriceHistories errors", () => {
  type Entry = { request: { method: string; url: string }; response: { content: Record<string, unknown> } };

  function harWith(edit: (entries: Entry[]) => void): string {
    const har = JSON.parse(FIXTURE);
    edit(har.log.entries);
    return JSON.stringify(har);
  }

  function entryOf(entries: Entry[], tokenId: string): Entry {
    return entries.find((entry) => entry.request.method === "GET" && entry.request.url.includes(`token_id=${tokenId}&`)) as Entry;
  }

  function setPoints(entry: Entry, data: unknown[]): void {
    entry.response.content = { mimeType: "application/json", text: JSON.stringify({ data, pagination: {} }) };
  }

  function messageOf(harText: string): string {
    try {
      readPriceHistories(harText, LINES);
    } catch (error) {
      return (error as Error).message;
    }
    return "no error";
  }

  it("reports a file that is not a HAR", () => {
    for (const text of ["not json", "{}", "{\"log\":{}}"]) {
      expect(messageOf(text)).toBe("is not a HAR file");
    }
  });

  it("names the first line, in legend order, that has no history", () => {
    const har = harWith((entries) => {
      entries.splice(entries.indexOf(entryOf(entries, "333")), 1);
    });
    expect(messageOf(har)).toBe("has no price history for \"Gamma\"");
  });

  it("names a line with a point whose timestamp is missing or not a number", () => {
    for (const point of [{ price: 0.5 }, { timestamp: "abc", price: 0.5 }]) {
      const har = harWith((entries) => setPoints(entryOf(entries, "111"), [point]));
      expect(messageOf(har)).toBe("history for \"Alpha\" has a point with no timestamp or a timestamp that is not a number");
    }
  });

  it("names a line with a price outside 0 to 1, not a number, or missing", () => {
    for (const point of [{ timestamp: 1780617600, price: 1.5 }, { timestamp: 1780617600, price: -0.1 }, { timestamp: 1780617600, price: "0.5" }, { timestamp: 1780617600 }]) {
      const har = harWith((entries) => setPoints(entryOf(entries, "222"), [point]));
      expect(messageOf(har)).toBe("history for \"Beta\" has a price that is not a number from 0 to 1");
    }
  });

  it("names a line whose response has no body or no data array", () => {
    for (const content of [{ mimeType: "application/json" }, { mimeType: "application/json", text: "{\"error\":\"x\"}" }, { mimeType: "text/html", text: "<html>" }]) {
      const har = harWith((entries) => {
        entryOf(entries, "333").response.content = content;
      });
      expect(messageOf(har)).toBe("history for \"Gamma\" is not readable");
    }
  });

  it("checks every point, even one that a repeated timestamp would drop", () => {
    const har = harWith((entries) => {
      const repeat = entries.find((entry) => entry.request.url.includes("interval=1w")) as Entry;
      setPoints(repeat, [{ timestamp: 1780660800, price: 2 }]);
    });
    expect(messageOf(har)).toBe("history for \"Alpha\" has a price that is not a number from 0 to 1");
  });

  const NO_PRICE_HISTORY = "has no price-history responses; save the HAR with DevTools open on the Network tab before the page loads";

  function analyticsEntries(): Entry[] {
    return [
      { request: { method: "POST", url: "https://polymarket.com/~partytown/proxytown" }, response: { content: { mimeType: "text/plain", text: "" } } },
      { request: { method: "GET", url: "https://polymarket.com/manifest.json" }, response: { content: { mimeType: "application/json", text: "{}" } } },
    ];
  }

  it("says so when a HAR holds no price-history request at all", () => {
    const analyticsOnly = harWith((entries) => entries.splice(0, entries.length, ...analyticsEntries()));
    expect(messageOf(analyticsOnly)).toBe(NO_PRICE_HISTORY);
    expect(messageOf(harWith((entries) => entries.splice(0)))).toBe(NO_PRICE_HISTORY);
  });

  it("does not count an OPTIONS pre-flight as a price-history request", () => {
    const preflightOnly = harWith((entries) => {
      const preflight = entries.find((entry) => entry.request.method === "OPTIONS") as Entry;
      entries.splice(0, entries.length, preflight);
    });
    expect(messageOf(preflightOnly)).toBe(NO_PRICE_HISTORY);
  });

  it("does not count a request whose path does not end in /prices-history", () => {
    const otherPath = harWith((entries) => {
      const entry = entryOf(entries, "999");
      entry.request.url = "https://polymarket.com/prices-history-help?token_id=999";
      entries.splice(0, entries.length, entry);
    });
    expect(messageOf(otherPath)).toBe(NO_PRICE_HISTORY);
  });

  it("names the first drawn line when the HAR holds only undrawn outcomes' histories", () => {
    const undrawnOnly = harWith((entries) => entries.splice(0, entries.length, entryOf(entries, "999")));
    expect(messageOf(undrawnOnly)).toBe("has no price history for \"Alpha\"");
  });

  it("never puts request headers in a message", () => {
    const har = harWith((entries) => setPoints(entryOf(entries, "111"), [{ price: 0.5 }]));
    expect(messageOf(har)).not.toContain("secret-cookie");
  });
});
