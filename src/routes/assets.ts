import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { RequestHandler } from "express";
import express from "express";
import type { AppConfig } from "../config.js";

export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

/**
 * Serves the HTML pages with their asset references rewritten to the fingerprinted
 * copies (from the CDN when Spaces is configured, from this instance otherwise) and
 * with a validator, so a reload costs nothing when nothing changed.
 */
export function createAssetServing(publicDir: string, config: Pick<AppConfig, "spaces"> & Partial<Pick<AppConfig, "publicOrigin">>) {
  const manifestPath = path.join(publicDir, "asset-manifest.json");
  const manifest: Record<string, string> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
  const cdn = config.spaces ? `${config.spaces.cdnUrl.replace(/\/$/, "")}/assets` : "/assets";
  const pages = new Map<string, { html: string; etag: string }>();

  function assetUrl(reference: string): string {
    const fingerprinted = manifest[reference];
    return fingerprinted ? `${cdn}/${fingerprinted}` : reference;
  }

  /** The page with its asset references rewritten; a canonical path adds the page's canonical link. */
  function render(name: string, canonicalPath?: string): { html: string; etag: string } {
    const key = canonicalPath === undefined ? name : `${name} ${canonicalPath}`;
    const cached = pages.get(key);
    if (cached) return cached;
    const raw = readFileSync(path.join(publicDir, name), "utf8");
    const canonical = canonicalPath !== undefined && config.publicOrigin ? `  <link rel="canonical" href="${config.publicOrigin}${canonicalPath}">\n` : "";
    const html = raw.replace(/<\/head>/, `${canonical}</head>`).replace(/(href|src)="(\/[\w.-]+\.(?:js|css|svg|png|jpg|ico|woff2))"/g, (_m, attr, ref) => `${attr}="${assetUrl(ref)}"`);
    const rendered = { html, etag: `"${createHash("sha256").update(html).digest("hex").slice(0, 32)}"` };
    pages.set(key, rendered);
    return rendered;
  }

  const sendPage = (name: string, status = 200, cacheControl = "no-cache", canonicalPath?: string): RequestHandler => (req, res) => {
    const { html, etag } = render(name, canonicalPath);
    res.setHeader("ETag", etag);
    res.setHeader("Cache-Control", cacheControl);
    if (status === 200 && req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }
    res.status(status).type("html").send(html);
  };

  const fingerprinted: RequestHandler = express.static(path.join(publicDir, "assets"), {
    index: false,
    immutable: true,
    maxAge: "365d",
    setHeaders: (res) => res.setHeader("Cache-Control", IMMUTABLE_CACHE)
  });

  return { sendPage, pageHtml: (name: string) => render(name).html, fingerprinted, assetUrl, assetsBaseUrl: config.spaces ? cdn : "" };
}
