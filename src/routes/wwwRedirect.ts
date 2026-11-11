import type { NextFunction, Request, Response } from "express";

/**
 * Sends a request for the `www.` name of the public origin's host to the public origin, same path and query:
 * login links, the session cookie, canonical links and the human check all belong to the public origin.
 * Any other host (health checks, localhost, tests) passes through untouched.
 */
export function createWwwRedirect(publicOrigin: string) {
  const origin = new URL(publicOrigin);
  const wwwHost = "www." + origin.hostname.toLowerCase();
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.hostname.toLowerCase() !== wwwHost) {
      next();
      return;
    }
    // 308 keeps the method and body of anything but a page load.
    const status = req.method === "GET" || req.method === "HEAD" ? 301 : 308;
    res.redirect(status, origin.origin + req.originalUrl);
  };
}
