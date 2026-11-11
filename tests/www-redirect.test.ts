// The www. name of the public origin's host is sent to the public origin; every other host passes through.
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createWwwRedirect } from "../src/routes/wwwRedirect.js";

function app(publicOrigin = "https://crowdpoll.vote") {
  const app = express();
  app.set("trust proxy", true);
  app.use(createWwwRedirect(publicOrigin));
  app.all("/{*rest}", (_req, res) => {
    res.send("served");
  });
  return app;
}

describe("www redirect", () => {
  it("sends a page load on www to the same path and query on the public origin, permanently", async () => {
    const res = await request(app()).get("/?PID=abc&tab=trending").set("Host", "www.crowdpoll.vote");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("https://crowdpoll.vote/?PID=abc&tab=trending");
  });

  it("matches the host whatever its case, and the host the proxy forwarded", async () => {
    const res = await request(app()).get("/terms").set("Host", "WWW.CrowdPoll.vote");
    expect(res.headers.location).toBe("https://crowdpoll.vote/terms");
    const forwarded = await request(app()).get("/privacy").set("X-Forwarded-Host", "www.crowdpoll.vote");
    expect(forwarded.headers.location).toBe("https://crowdpoll.vote/privacy");
  });

  it("keeps the method of anything but a page load", async () => {
    const res = await request(app()).post("/api/auth/request-login-link").set("Host", "www.crowdpoll.vote").send({});
    expect(res.status).toBe(308);
    expect(res.headers.location).toBe("https://crowdpoll.vote/api/auth/request-login-link");
  });

  it("serves the public origin's own host and any other host", async () => {
    for (const host of ["crowdpoll.vote", "10.0.0.5:8080", "localhost:3000", "www.example.com"]) {
      const res = await request(app()).get("/").set("Host", host);
      expect(res.status, host).toBe(200);
    }
  });

  it("follows the public origin in development", async () => {
    const res = await request(app("http://localhost:3000")).get("/login").set("Host", "www.localhost:3000");
    expect(res.headers.location).toBe("http://localhost:3000/login");
  });
});
