import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

/** A fresh copy of the module, so its once-per-start report starts unsent. */
function load(): { useEdgeAddress: (req: { headers: Record<string, string | undefined> }, log?: (line: string) => void) => void } {
  const file = require.resolve("../fcaptcha-server/clientAddress.js");
  delete require.cache[file];
  return require(file);
}

describe("the FCaptcha client address", () => {
  it("takes the visitor's address from do-connecting-ip, replacing a supplied X-Real-IP", () => {
    const { useEdgeAddress } = load();
    const req = { headers: { "do-connecting-ip": " 203.0.113.7 ", "x-real-ip": "198.51.100.1" } };
    useEdgeAddress(req, () => {});
    expect(req.headers["x-real-ip"]).toBe("203.0.113.7");
  });

  it("drops a supplied X-Real-IP when do-connecting-ip is absent, leaving X-Forwarded-For", () => {
    const { useEdgeAddress } = load();
    const req = { headers: { "x-real-ip": "198.51.100.1", "x-forwarded-for": "203.0.113.7" } as Record<string, string | undefined> };
    useEdgeAddress(req, () => {});
    expect(req.headers["x-real-ip"]).toBeUndefined();
    expect(req.headers["x-forwarded-for"]).toBe("203.0.113.7");
  });

  it("reports once per start whether the edge header arrives, without the address", () => {
    const { useEdgeAddress } = load();
    const lines: string[] = [];
    useEdgeAddress({ headers: { "do-connecting-ip": "203.0.113.7" } }, (line) => lines.push(line));
    useEdgeAddress({ headers: {} }, (line) => lines.push(line));
    expect(lines).toEqual(["[client-ip] do-connecting-ip present; it is the visitor's address"]);
    expect(lines.join()).not.toContain("203.0.113");
  });
});
