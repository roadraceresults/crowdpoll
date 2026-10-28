import express from "express";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig, ConfigError } from "../src/config.js";
import { createPrototypesRouter, rewritePrototypePage } from "../src/routes/prototypes.js";
import { startTestContext, type TestContext } from "./helpers/setup.js";

const NAME = "SINGLE-COLUMN-RENDERING";
const PAGE = `/prototypes/${NAME}/index.html`;
const FOLDER = `/prototypes/${NAME}/`;

function appServing(prototypes: string[]) {
  const app = express();
  app.use(createPrototypesRouter({ prototypes }));
  return app;
}

describe("ENV_PROTOTYPES", () => {
  const env = { ENV_BETTER_AUTH_SECRET: "test-secret-0123456789-0123456789-0123456789", ENV_PUBLIC_ORIGIN: "http://localhost:8080" };

  it("is empty by default and reads a comma-separated list", () => {
    expect(loadConfig(env).prototypes).toEqual([]);
    expect(loadConfig({ ...env, ENV_PROTOTYPES: " A-1 , b_2 ,," }).prototypes).toEqual(["A-1", "b_2"]);
  });

  it("refuses a name that could hold a path", () => {
    for (const bad of ["../x", "a/b", "a b", "a.b"]) {
      expect(() => loadConfig({ ...env, ENV_PROTOTYPES: bad })).toThrow(ConfigError);
    }
    expect(() => loadConfig({ ...env, ENV_PROTOTYPES: "../x" })).toThrow(/ENV_PROTOTYPES/);
  });
});

describe("rewritePrototypePage", () => {
  it("points links to the app's files at the server and adds noindex to the head", () => {
    const html = rewritePrototypePage('<head><link rel="stylesheet" href="../../src/public/site.css"><script src="../../src/public/pollCard.js" defer></script><link href="single-column.css"></head>');
    expect(html).toContain('href="/site.css"');
    expect(html).toContain('src="/pollCard.js"');
    expect(html).toContain('href="single-column.css"');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).not.toContain("../../src/public");
  });
});

describe("the prototypes route", () => {
  it("answers 404 for every address while nothing is listed", async () => {
    const app = appServing([]);
    expect((await request(app).get(PAGE)).status).toBe(404);
    expect((await request(app).get(FOLDER)).status).toBe(404);
  });

  it("serves the listed folder at both addresses, rewritten, noindex, uncached", async () => {
    const app = appServing([NAME]);
    for (const url of [PAGE, FOLDER]) {
      const res = await request(app).get(url);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/html/);
      expect(res.headers["x-robots-tag"]).toBe("noindex");
      expect(res.headers["cache-control"]).toBe("no-cache");
      expect(res.text).toContain('<meta name="robots" content="noindex">');
      expect(res.text).toContain('href="/m3-tokens.css"');
      expect(res.text).not.toContain("../../src/public");
    }
  });

  it("redirects the folder without its slash and serves the folder's own files", async () => {
    const app = appServing([NAME]);
    const redirect = await request(app).get(`/prototypes/${NAME}`);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.location).toBe(FOLDER);
    for (const file of ["single-column.css", "prototype.js"]) {
      const res = await request(app).get(`${FOLDER}${file}`);
      expect(res.status).toBe(200);
      expect(res.headers["x-robots-tag"]).toBe("noindex");
    }
  });

  it("does not serve notes, screenshots, other folders, missing files or paths that leave the folder", async () => {
    const app = appServing([NAME]);
    for (const url of [
      `${FOLDER}iterative-requirements.md`,
      `${FOLDER}poll-card-01.jpg`,
      `${FOLDER}missing.css`,
      `${FOLDER}..%2f..%2fpackage.json`,
      `${FOLDER}%2e%2e/COLOR-PALETTE-EDITOR/index.html`,
      `${FOLDER}..%5cindex.html`,
      "/prototypes/COLOR-PALETTE-EDITOR/index.html",
      "/prototypes/COLOR-PALETTE-EDITOR/"
    ]) {
      expect((await request(app).get(url).redirects(0)).status, url).toBe(404);
    }
  });

  it("does not answer other methods", async () => {
    expect((await request(appServing([NAME])).post(PAGE)).status).toBe(404);
  });

  it("reads the folder from the prototypes directory it is given", async () => {
    const app = express();
    app.use(createPrototypesRouter({ prototypes: ["other"] }, path.join(process.cwd(), "prototypes")));
    expect((await request(app).get("/prototypes/other/index.html")).status).toBe(404);
  });
});

describe("the prototypes route in the server", () => {
  let off: TestContext;
  let on: TestContext;

  beforeAll(async () => {
    off = await startTestContext();
    on = await startTestContext({ ENV_PROTOTYPES: NAME });
  });

  afterAll(async () => {
    await off.stop();
    await on.stop();
  });

  it("is off unless ENV_PROTOTYPES lists the folder", async () => {
    expect((await request(off.app).get(FOLDER)).status).toBe(404);
    expect((await request(off.app).get(PAGE).redirects(1)).status).toBe(404);
  });

  it("serves .../index.html as written, ahead of the .html redirect", async () => {
    const res = await request(on.app).get(PAGE).redirects(0);
    expect(res.status).toBe(200);
    expect(res.text).toContain('<meta name="robots" content="noindex">');
    expect((await request(on.app).get(FOLDER).redirects(0)).status).toBe(200);
  });

  it("still redirects other .html paths", async () => {
    const res = await request(on.app).get("/login.html").redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login");
  });
});
