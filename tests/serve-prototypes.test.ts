import type { AddressInfo } from "node:net";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrototypeServer, listPrototypes, repositoryRoot, requestLine, resolveServedPath } from "../devScripts/serve-prototypes.js";

const root = repositoryRoot();
const lines: string[] = [];
const server = createPrototypeServer(root, (line) => lines.push(line));
let base = "";

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("resolveServedPath", () => {
  it("allows files under prototypes/ and src/public/", () => {
    expect(resolveServedPath(root, "/prototypes/SINGLE-COLUMN-RENDERING/index.html")).toBe(path.join(root, "prototypes", "SINGLE-COLUMN-RENDERING", "index.html"));
    expect(resolveServedPath(root, "/src/public/pollCard.js")).toBe(path.join(root, "src", "public", "pollCard.js"));
  });

  it("refuses other folders, parent segments and encoded parent segments", () => {
    for (const url of ["/package.json", "/src/server.ts", "/prototypes/../package.json", "/prototypes/%2e%2e/package.json", "/prototypes/..%2fpackage.json", "/%00"]) {
      expect(resolveServedPath(root, url)).toBeNull();
    }
  });
});

describe("the prototype server", () => {
  it("lists the prototypes that have a page", async () => {
    expect(listPrototypes(root)).toContain("SINGLE-COLUMN-RENDERING");
    const page = await fetch(`${base}/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("/prototypes/SINGLE-COLUMN-RENDERING/");
  });

  it("serves a prototype page and an app file, never cached", async () => {
    for (const url of ["/prototypes/SINGLE-COLUMN-RENDERING/", "/src/public/pollCard.js"]) {
      const res = await fetch(`${base}${url}`);
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("answers 404 outside the served folders", async () => {
    for (const url of ["/package.json", "/src/server.ts", "/nope"]) {
      expect((await fetch(`${base}${url}`)).status).toBe(404);
    }
  });
});

describe("the request log", () => {
  it("formats the time, the address, the method, the path and the status", () => {
    const line = requestLine(new Date(2026, 9, 11, 14, 2, 11), "::ffff:192.168.0.23", "GET", "/prototypes/X/", 200);
    expect(line).toBe("[prototypes] 14:02:11 192.168.0.23 GET /prototypes/X/ 200");
  });

  it("logs each request the server answers", async () => {
    await fetch(`${base}/nope`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(lines.some((line) => line.endsWith("GET /nope 404"))).toBe(true);
  });
});
