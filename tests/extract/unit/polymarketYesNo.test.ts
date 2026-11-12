import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractYesNo, readPolymarketEvents } from "../../../devScripts/extract/polymarketYesNo.js";

const FIXTURE = fs.readFileSync(new URL("../fixtures/polymarket-yes-no.html", import.meta.url), "utf8");
const NAVIGATED = fs.readFileSync(new URL("../fixtures/polymarket-yes-no-navigated.html", import.meta.url), "utf8");
const TITLE = "Dancing with the Stars S35: Winner?";
const PAGE = "page.html";

function pageOf(...lines: unknown[]): string {
  const payload = lines.map((line, index) => `${index.toString(16)}:${JSON.stringify(line)}\n`).join("");
  return `<html><body><script>self.__next_f.push(${JSON.stringify([1, payload])})</script></body></html>`;
}

function eventPage(markets: unknown[], title = TITLE): string {
  return pageOf({ state: { data: { title, markets } } });
}

function extract(html: string, graphTitle = TITLE) {
  return extractYesNo({ graphTitle, inputHtml: PAGE, html });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-08T03:30:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("readPolymarketEvents", () => {
  it("finds the event across a line split between two pushes and skips non-JSON lines", () => {
    expect(readPolymarketEvents(FIXTURE)).toEqual([
      {
        title: TITLE,
        markets: [
          { name: "Ezra Frech", bestAsk: 0.63 },
          { name: "Connor Wood", bestAsk: 0.075 },
          { name: "Taylor Hanson", bestAsk: 0.001 },
          { name: "Tyler Cameron", bestAsk: undefined },
        ],
      },
    ]);
  });

  it("finds nothing in a page without the payload", () => {
    expect(readPolymarketEvents("<html><body><script>var x = 1;</script></body></html>")).toEqual([]);
  });
});

describe("extractYesNo", () => {
  it("writes every outcome in page order with one point dated today in US Eastern time", async () => {
    expect(await extract(FIXTURE)).toEqual({
      graph: {
        graph_title: TITLE,
        label_a: "Ezra Frech",
        label_b: "Connor Wood",
        label_c: "Taylor Hanson",
        label_d: "Tyler Cameron",
        data_points: [{ date: "11/07/26", a: 63, b: 7.5, c: 0.1, d: 0 }],
      },
      warnings: [],
    });
  });

  it("gives 0 to a price that is not a number", async () => {
    const { graph } = await extract(eventPage([{ groupItemTitle: "A", bestAsk: "0.5" }, { groupItemTitle: "B", bestAsk: null }]));
    expect(graph.data_points).toEqual([{ date: "11/07/26", a: 0, b: 0 }]);
  });

  it("trims the outcome names", async () => {
    const { graph } = await extract(eventPage([{ groupItemTitle: "  Ezra Frech ", bestAsk: 0.5 }]));
    expect(graph.label_a).toBe("Ezra Frech");
  });

  it("matches the title ignoring typographic quotes and repeated spaces", async () => {
    const page = eventPage([{ groupItemTitle: "A", bestAsk: 0.5 }], "Who’s  the winner?");
    expect((await extract(page, "Who's the winner?")).graph.graph_title).toBe("Who’s  the winner?");
  });

  it("uses the first event whose title matches", async () => {
    const page = pageOf(
      { title: "Other event", markets: [{ groupItemTitle: "X", bestAsk: 0.5 }] },
      { title: TITLE, markets: [{ groupItemTitle: "A", bestAsk: 0.2 }] },
      { title: TITLE, markets: [{ groupItemTitle: "B", bestAsk: 0.3 }] },
    );
    expect((await extract(page)).graph.label_a).toBe("A");
  });

  it("reports a page without event data or outcomes", async () => {
    const message = `no Polymarket yes/no table found in ${PAGE}`;
    await expect(extract("<html><body></body></html>")).rejects.toThrow(message);
    await expect(extract(eventPage([]))).rejects.toThrow(message);
  });

  it("reports an event title that does not match", async () => {
    await expect(extract(FIXTURE, "Who wins?")).rejects.toThrow(`graph "Who wins?" not found in ${PAGE}; the page's event is "${TITLE}"`);
  });

  it("reads the drawn rows of a page saved after moving to another event", async () => {
    expect(await extract(NAVIGATED, "NBA: 2027 Champion")).toEqual({
      graph: {
        graph_title: "NBA: 2027 Champion",
        label_a: "San Antonio Spurs",
        label_b: "Philadelphia 76ers",
        label_c: "Milwaukee Bucks",
        data_points: [{ date: "11/07/26", a: 22, b: 13.4, c: 0 }],
      },
      warnings: [],
    });
  });

  it("prefers the event data when it matches, and reports a title matching neither", async () => {
    expect((await extract(NAVIGATED)).graph).toMatchObject({ label_a: "Ezra Frech", data_points: [{ date: "11/07/26", a: 63 }] });
    await expect(extract(NAVIGATED, "Who wins?")).rejects.toThrow(`graph "Who wins?" not found in ${PAGE}; the page's event is "${TITLE}"`);
  });

  it("reads drawn rows when the page has no event data", async () => {
    const page = "<html><body><h1>Who wins?</h1><p id=\"n\">A</p><button aria-labelledby=\"b n\">Buy Yes 40¢</button></body></html>";
    expect((await extract(page, "Who wins?")).graph).toMatchObject({ label_a: "A", data_points: [{ a: 40 }] });
  });

  it("letters outcomes 27 to 50 aa to ax", async () => {
    const markets = Array.from({ length: 50 }, (_, index) => ({ groupItemTitle: `O${index + 1}`, bestAsk: 0.01 }));
    const { graph } = await extract(eventPage(markets));
    expect(graph).toMatchObject({ label_a: "O1", label_z: "O26", label_aa: "O27", label_ax: "O50" });
    expect(Object.keys(graph.data_points[0]!).slice(26, 29)).toEqual(["z", "aa", "ab"]);
    expect(Object.keys(graph.data_points[0]!).at(-1)).toBe("ax");
  });

  it("refuses more than 50 outcomes", async () => {
    const markets = Array.from({ length: 51 }, (_, index) => ({ groupItemTitle: `O${index}`, bestAsk: 0.01 }));
    await expect(extract(eventPage(markets))).rejects.toThrow(`page ${PAGE}: has more than 50 outcomes`);
  });

  it("refuses an outcome without a name", async () => {
    const page = eventPage([{ groupItemTitle: "A", bestAsk: 0.5 }, { groupItemTitle: " ", bestAsk: 0.5 }]);
    await expect(extract(page)).rejects.toThrow(`page ${PAGE}: outcome 2 has no name`);
  });
});
