import { Router, type Request, type RequestHandler, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AppConfig } from "../config.js";
import type { SessionCache } from "../auth/sessionCache.js";
import type { Cache } from "../cache/cache.js";
import type { Db } from "../polls/store.js";
import { indexablePolls, isIndexable, mayViewResults } from "../polls/access.js";
import { readOrRebuildCounts } from "../polls/counters.js";
import { parsePid } from "../polls/sharedLink.js";
import { projectPoll } from "../polls/versions.js";
import { renderPollPage } from "../seo/pollPage.js";
import { createAssetServing } from "./assets.js";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

// Sitemap limits and format: https://www.sitemaps.org/protocol.html
export const SITEMAP_PART_SIZE = 50_000;
const SITEMAP_TTL_MS = 5 * 60_000;
const SITEMAP_CACHE_CONTROL = "public, max-age=300";
export const SITEMAP_CACHE_KEY = "seo:sitemap";

const ROBOTS = (origin: string) =>
  [
    "User-agent: *",
    "Allow: /",
    "Allow: /poll/",
    "Allow: /privacy",
    "Allow: /terms",
    "Disallow: /api/",
    "Disallow: /admin",
    "Disallow: /profile",
    "Disallow: /login",
    "Disallow: /create-account",
    "Disallow: /invite",
    "Disallow: /confirm-signin",
    "Disallow: /accept-terms",
    `Sitemap: ${origin}/sitemap.xml`,
    ""
  ].join("\n");

export interface SeoDeps {
  db: Db;
  cache: Cache;
  config: AppConfig;
  sessions: SessionCache;
}

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

interface Entry {
  loc: string;
  lastmod?: Date | null;
}

function urlset(entries: Entry[]): string {
  const urls = entries
    .map((e) => `<url><loc>${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod.toISOString()}</lastmod>` : ""}</url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function sitemapIndex(origin: string, parts: number): string {
  const maps = Array.from({ length: parts }, (_v, i) => `<sitemap><loc>${origin}/sitemap-${i + 1}.xml</loc></sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${maps}\n</sitemapindex>\n`;
}

/** Crawler files and the poll pages search engines index. */
export function createSeoRouter({ db, cache, config, sessions }: SeoDeps, { partSize = SITEMAP_PART_SIZE } = {}): Router {
  const router = Router();
  const assets = createAssetServing(publicDir, config);
  const origin = config.publicOrigin;

  /** Builds every part, caches them, and returns the one asked for (0 = /sitemap.xml). */
  async function buildSitemap(part: number): Promise<string | null> {
    const polls = await indexablePolls(db);
    const entries: Entry[] = [
      { loc: `${origin}/` },
      ...polls.map((poll) => ({ loc: `${origin}/poll/${poll.id}`, lastmod: poll.closed_at ?? poll.launched_at }))
    ];
    const parts: string[] = [];
    for (let i = 0; i < entries.length; i += partSize) parts.push(urlset(entries.slice(i, i + partSize)));
    const top = parts.length === 1 ? parts[0]! : sitemapIndex(origin, parts.length);
    await cache.set(SITEMAP_CACHE_KEY, top, SITEMAP_TTL_MS);
    if (parts.length > 1) {
      await Promise.all(parts.map((xml, i) => cache.set(`${SITEMAP_CACHE_KEY}:${i + 1}`, xml, SITEMAP_TTL_MS)));
    }
    if (part === 0) return top;
    return parts.length > 1 ? parts[part - 1] ?? null : null;
  }

  async function sitemap(part: number): Promise<string | null> {
    const key = part === 0 ? SITEMAP_CACHE_KEY : `${SITEMAP_CACHE_KEY}:${part}`;
    const cached = await cache.get(key);
    if (cached !== null) return cached;
    // A part asked for while the top file is still cached does not exist: the parts are written with it.
    if (part > 0 && (await cache.get(SITEMAP_CACHE_KEY)) !== null) return null;
    return buildSitemap(part);
  }

  function sendSitemap(res: Response, xml: string | null): void {
    if (xml === null) {
      res.status(404).send("Not found");
      return;
    }
    res.setHeader("Cache-Control", SITEMAP_CACHE_CONTROL);
    res.type("application/xml").send(xml);
  }

  router.get("/robots.txt", (_req, res) => {
    res.setHeader("Cache-Control", SITEMAP_CACHE_CONTROL);
    res.type("text/plain").send(ROBOTS(origin));
  });

  router.get(
    "/sitemap.xml",
    wrap(async (_req, res) => {
      sendSitemap(res, await sitemap(0));
    })
  );

  router.get(
    /^\/sitemap-(\d+)\.xml$/,
    wrap(async (req, res) => {
      const part = Number((req.params as Record<string, string>)[0]);
      sendSitemap(res, part >= 1 ? await sitemap(part) : null);
    })
  );

  router.get(
    "/poll/:pid",
    wrap(async (req, res) => {
      const pid = parsePid(req.params.pid);
      if (pid && (await sessions.getSession(req))) {
        res.redirect(`/?PID=${pid}`);
        return;
      }
      const row = pid ? await db.selectFrom("polls").selectAll().where("id", "=", pid).executeTakeFirst() : undefined;
      if (!pid || !row || !isIndexable(row) || !(await mayViewResults({ db, config }, undefined, pid))) {
        res.status(404).send("Not found");
        return;
      }
      const counts = (await readOrRebuildCounts({ db, cache }, [pid])).get(pid) ?? { voteCount: 0, choiceCounts: {}, countsVersion: 0 };
      res.setHeader("Cache-Control", "no-cache");
      res.type("html").send(renderPollPage(assets.pageHtml("index.html"), projectPoll(row), counts, origin));
    })
  );

  return router;
}
