import * as cheerio from "cheerio";
import type { GraphType } from "./graphTypes.js";

export interface Detection {
  type?: GraphType;
  markers: string[];
}

export function typeOfHost(host: string, types: GraphType[]): GraphType | undefined {
  return types.find((type) => type.hosts.some((site) => host === site || host.endsWith(`.${site}`)));
}

function hostOf(address: string | undefined): string | undefined {
  if (address === undefined) return undefined;
  try {
    return new URL(address).hostname || undefined;
  } catch {
    return undefined;
  }
}

export function detectPage(html: string, types: GraphType[]): Detection {
  const $ = cheerio.load(html);
  const links: [string, string | undefined][] = [
    ["canonical", $("link[rel=\"canonical\"]").attr("href")],
    ["og:url", $("meta[property=\"og:url\"]").attr("content")],
  ];
  for (const [source, address] of links) {
    const host = hostOf(address);
    if (host === undefined) continue;
    const type = typeOfHost(host, types);
    const markers = [`${source} host ${host}`];
    return type === undefined ? { markers } : { type, markers };
  }

  const matches = types.filter((type) => type.matchesPage($));
  const markers = matches.map((type) => type.signature);
  return matches.length === 1 ? { type: matches[0], markers } : { markers };
}
