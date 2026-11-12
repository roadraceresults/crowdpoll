import type { CheerioAPI } from "cheerio";
import { extractCnn } from "./extractCli.js";
import type { GraphInput, GraphResult } from "./graphExtraction.js";
import { extractPolitico } from "./politicoCli.js";
import { extractPolymarket } from "./polymarketCli.js";
import { extractYesNo } from "./polymarketYesNo.js";

export interface GraphType {
  id: string;
  name: string;
  hosts: string[];
  signature: string;
  matchesPage($: CheerioAPI): boolean;
  needsHistory: boolean;
  detected: boolean;
  extract(input: GraphInput): Promise<GraphResult>;
}

function hasChartState($: CheerioAPI): boolean {
  return $("[data-state]")
    .toArray()
    .some((element) => {
      try {
        const state: unknown = JSON.parse($(element).attr("data-state") ?? "");
        return typeof state === "object" && state !== null && typeof (state as { title?: unknown }).title === "string";
      } catch {
        return false;
      }
    });
}

export const GRAPH_TYPES: GraphType[] = [
  {
    id: "polymarket yes no",
    name: "Polymarket yes/no",
    hosts: ["polymarket.com"],
    signature: "",
    matchesPage: () => false,
    needsHistory: false,
    detected: false,
    extract: extractYesNo,
  },
  {
    id: "cnn line graph",
    name: "CNN",
    hosts: ["cnn.com"],
    signature: "CNN chart data",
    matchesPage: hasChartState,
    needsHistory: false,
    detected: true,
    extract: extractCnn,
  },
  {
    id: "polymarket line graph",
    name: "Polymarket",
    hosts: ["polymarket.com"],
    signature: "Polymarket title",
    matchesPage: ($) => $("head > title").first().text().trim().startsWith("Polymarket"),
    needsHistory: true,
    detected: true,
    extract: extractPolymarket,
  },
  {
    id: "politico line graph",
    name: "Politico",
    hosts: ["politico.eu"],
    signature: "",
    matchesPage: () => false,
    needsHistory: false,
    detected: true,
    extract: extractPolitico,
  },
];
