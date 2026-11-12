import express, { Router } from "express";
import type { HumanCheckConfig } from "../config.js";

const FORWARDED_REQUEST_HEADERS = ["content-type", "origin", "referer", "user-agent", "accept"];

export { isLocalOrigin } from "../config.js";

/**
 * Development only: forwards `/fcaptcha/*` to the FCaptcha server with the prefix removed, as App Platform's ingress
 * does in production (https://docs.digitalocean.com/products/app-platform/how-to/manage-internal-routing/), so the
 * widget and its calls stay same-origin on a local run.
 */
export function createFcaptchaDevProxy(settings: HumanCheckConfig, fetchImpl: typeof fetch = fetch): Router {
  const router = Router();
  router.use("/fcaptcha", express.raw({ type: () => true, limit: "64kb" }), async (req, res) => {
    const headers = new Headers();
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = req.headers[name];
      if (typeof value === "string") headers.set(name, value);
    }
    if (req.ip) headers.set("x-forwarded-for", req.ip);
    const hasBody = req.method !== "GET" && req.method !== "HEAD" && Buffer.isBuffer(req.body) && req.body.length > 0;
    try {
      const answer = await fetchImpl(`${settings.url}${req.url}`, {
        method: req.method,
        headers,
        body: hasBody ? new Uint8Array(req.body as Buffer) : undefined
      });
      res.status(answer.status);
      const type = answer.headers.get("content-type");
      if (type) res.type(type);
      res.send(Buffer.from(await answer.arrayBuffer()));
    } catch {
      res.status(502).type("text/plain").send("FCaptcha is not reachable at ENV_FCAPTCHA_URL.");
    }
  });
  return router;
}
