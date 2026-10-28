import { Router } from "express";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AppConfig } from "../config.js";

/**
 * Serves the prototype folders named in ENV_PROTOTYPES from the repository's
 * prototypes/ directory (temporary, unlisted, noindex). Unset means none: every
 * address falls through and answers 404. Only page and asset file types are
 * sent, so notes and screenshots kept in a folder are never served.
 */
const SERVED_EXTENSIONS = new Set([".html", ".css", ".js", ".svg", ".png", ".ico", ".woff2"]);
const NOINDEX_META = '<meta name="robots" content="noindex">';
const APP_FILE_LINK = /(href|src)="\.\.\/\.\.\/src\/public\/([\w.-]+)"/g;

const defaultPrototypesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "prototypes");

/** A prototype page, with its links to the app's own files pointed at the server's and search engines told to skip it. */
export function rewritePrototypePage(html: string): string {
  const rewritten = html.replace(APP_FILE_LINK, (_match, attr: string, file: string) => `${attr}="/${file}"`);
  return /<head>/i.test(rewritten) ? rewritten.replace(/<head>/i, `<head>\n${NOINDEX_META}`) : `${NOINDEX_META}\n${rewritten}`;
}

export function createPrototypesRouter(config: Pick<AppConfig, "prototypes">, prototypesDir = defaultPrototypesDir): Router {
  const router = Router();
  if (config.prototypes.length === 0) return router;
  const headers = { "X-Robots-Tag": "noindex", "Cache-Control": "no-cache" };

  router.use("/prototypes", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const [, name, rest] = /^\/([^/]+)(\/.*)?$/.exec(req.path) ?? [];
    if (!name || !config.prototypes.includes(name)) return next();
    if (rest === undefined) return res.redirect(`/prototypes/${name}/`);

    let relative: string;
    try {
      relative = rest === "/" ? "index.html" : decodeURIComponent(rest.slice(1));
    } catch {
      return next();
    }
    if (relative.includes("\0") || relative.includes("\\")) return next();
    const folder = path.resolve(prototypesDir, name);
    const file = path.resolve(folder, relative);
    if (!file.startsWith(folder + path.sep)) return next();
    const extension = path.extname(file).toLowerCase();
    if (!SERVED_EXTENSIONS.has(extension)) return next();
    try {
      if (!statSync(file).isFile()) return next();
    } catch {
      return next();
    }

    res.set(headers);
    if (extension === ".html") {
      res.type("html").send(rewritePrototypePage(readFileSync(file, "utf8")));
      return;
    }
    res.sendFile(file, (err) => {
      if (err && !res.headersSent) next();
    });
  });
  return router;
}
