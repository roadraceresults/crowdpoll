import { describe, expect, it } from "vitest";
import { detectPage, typeOfHost } from "../../../devScripts/extract/detectGraphType.js";
import { GRAPH_TYPES as ALL_TYPES } from "../../../devScripts/extract/graphTypes.js";

const GRAPH_TYPES = ALL_TYPES.filter((type) => type.detected);

const CNN_STATE = "{&quot;type&quot;:&quot;politics-polling-composite&quot;,&quot;title&quot;:&quot;Approval&quot;}";

function page(head: string, body = ""): string {
  return `<!DOCTYPE html><html><head>${head}</head><body>${body}</body></html>`;
}

describe("typeOfHost", () => {
  it("maps each site and its subdomains to its type", () => {
    expect(typeOfHost("cnn.com", GRAPH_TYPES)?.id).toBe("cnn line graph");
    expect(typeOfHost("www.cnn.com", GRAPH_TYPES)?.id).toBe("cnn line graph");
    expect(typeOfHost("edition.cnn.com", GRAPH_TYPES)?.id).toBe("cnn line graph");
    expect(typeOfHost("polymarket.com", GRAPH_TYPES)?.id).toBe("polymarket line graph");
    expect(typeOfHost("www.politico.eu", GRAPH_TYPES)?.id).toBe("politico line graph");
  });

  it("rejects hosts that only contain a site name", () => {
    expect(typeOfHost("cnn.com.example.org", GRAPH_TYPES)).toBeUndefined();
    expect(typeOfHost("notcnn.com", GRAPH_TYPES)).toBeUndefined();
    expect(typeOfHost("example.com", GRAPH_TYPES)).toBeUndefined();
  });
});

describe("detectPage", () => {
  it("decides by the canonical link host", () => {
    const result = detectPage(page("<link rel=\"canonical\" href=\"https://www.politico.eu/europe-poll-of-polls/france/\">"), GRAPH_TYPES);
    expect(result.type?.id).toBe("politico line graph");
    expect(result.markers).toEqual(["canonical host www.politico.eu"]);
  });

  it("decides by og:url when there is no canonical link", () => {
    const result = detectPage(page("<meta property=\"og:url\" content=\"https://edition.cnn.com/polling/x\">"), GRAPH_TYPES);
    expect(result.type?.id).toBe("cnn line graph");
    expect(result.markers).toEqual(["og:url host edition.cnn.com"]);
  });

  it("ignores the signatures when the page carries a host", () => {
    const html = page("<title>Polymarket | AI</title><link rel=\"canonical\" href=\"https://www.cnn.com/x\">");
    expect(detectPage(html, GRAPH_TYPES).type?.id).toBe("cnn line graph");
  });

  it("reports an unsupported canonical host as no type", () => {
    const html = page("<title>Polymarket | AI</title><link rel=\"canonical\" href=\"https://example.org/x\">");
    const result = detectPage(html, GRAPH_TYPES);
    expect(result.type).toBeUndefined();
    expect(result.markers).toEqual(["canonical host example.org"]);
  });

  it("detects Polymarket by a document title starting with Polymarket", () => {
    const result = detectPage(page("<title>Polymarket | Best AI model</title>"), GRAPH_TYPES);
    expect(result.type?.id).toBe("polymarket line graph");
    expect(result.markers).toEqual(["Polymarket title"]);
  });

  it("does not take an SVG title for the document title", () => {
    const html = page("<title>Poll charts</title>", "<svg><title>Polymarket</title></svg>");
    expect(detectPage(html, GRAPH_TYPES).type).toBeUndefined();
  });

  it("detects CNN by data-state chart data with a title, ignoring data-state=\"closed\"", () => {
    const result = detectPage(page("<title>Poll charts</title>", `<div data-state="closed"></div><div data-state="${CNN_STATE}"></div>`), GRAPH_TYPES);
    expect(result.type?.id).toBe("cnn line graph");
    expect(result.markers).toEqual(["CNN chart data"]);
    expect(detectPage(page("<title>Polymarket</title>", "<div data-state=\"closed\"></div>"), GRAPH_TYPES).type?.id).toBe("polymarket line graph");
  });

  it("returns no type when two signatures match, listing both", () => {
    const result = detectPage(page("<title>Polymarket | AI</title>", `<div data-state="${CNN_STATE}"></div>`), GRAPH_TYPES);
    expect(result.type).toBeUndefined();
    expect(result.markers).toEqual(["CNN chart data", "Polymarket title"]);
  });

  it("returns no type and no markers for a page without any", () => {
    expect(detectPage(page("<title>Hello</title>"), GRAPH_TYPES)).toEqual({ markers: [] });
  });
});
