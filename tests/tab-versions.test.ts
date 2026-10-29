import { describe, expect, it } from "vitest";
import { MemoryCache } from "../src/cache/memoryCache.js";
import {
  ensureVersion,
  forgetTabs,
  readSeen,
  readVersion,
  recordSeen,
  shortcutAnswerable,
  TAB_SEEN_KEY,
  TAB_VERSION_KEY,
  type TabSeen
} from "../src/refresh/tabVersions.js";

const seen: TabSeen = {
  v: "v1",
  membershipVersion: "m1",
  order: ["p1", "p2"],
  rows: [
    ["p1", 3, 3],
    ["p2", 1, 0],
    ["p3", 5, 5]
  ]
};
const request = { membershipVersion: "m1", versions: { p1: [3, 7] as [number, number], p2: [0, 0] as [number, number] } };
const projections = () =>
  new Map<string, { contentVersion: number } | null>([
    ["p1", { contentVersion: 3 }],
    ["p2", { contentVersion: 1 }],
    ["p3", { contentVersion: 5 }]
  ]);

describe("tab list versions", () => {
  it("creates the version once and returns the existing value after", async () => {
    const cache = new MemoryCache();
    const first = await ensureVersion(cache, "a@b.com");
    expect(await ensureVersion(cache, "a@b.com")).toBe(first);
    expect(await readVersion(cache, "a@b.com")).toBe(first);
    const ttl = await cache.pttl(TAB_VERSION_KEY("a@b.com"));
    expect(ttl).toBeGreaterThan(23 * 60 * 60 * 1000);
  });

  it("never hands out the same value after a delete", async () => {
    const cache = new MemoryCache();
    const seenValues = new Set<string>();
    for (let i = 0; i < 20; i++) {
      seenValues.add(await ensureVersion(cache, "a@b.com"));
      await forgetTabs(cache, ["a@b.com"]);
    }
    expect(seenValues.size).toBe(20);
  });

  it("forgets by email key, so two spellings of one address share one version", async () => {
    const cache = new MemoryCache();
    await ensureVersion(cache, "ab@gmail.com");
    expect(TAB_VERSION_KEY("A.b+x@gmail.com")).toBe(TAB_VERSION_KEY("ab@gmail.com"));
    await forgetTabs(cache, ["A.b+x@gmail.com", "ab@gmail.com"]);
    expect(await readVersion(cache, "ab@gmail.com")).toBeNull();
  });

  it("swallows a cache failure, so a write never fails because of it", async () => {
    const cache = new MemoryCache();
    cache.setDisconnected(true);
    await expect(forgetTabs(cache, ["a@b.com"])).resolves.toBeUndefined();
  });

  it("records what a tab sent for five minutes", async () => {
    const cache = new MemoryCache();
    await recordSeen(cache, "a@b.com", "your-votes", seen);
    expect(await readSeen(cache, "a@b.com", "your-votes")).toEqual(seen);
    expect(await readSeen(cache, "a@b.com", "watching")).toBeNull();
    const ttl = await cache.pttl(TAB_SEEN_KEY("a@b.com", "your-votes"));
    expect(ttl).toBeGreaterThan(4 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(5 * 60 * 1000);
  });
});

describe("shortcutAnswerable", () => {
  it("is true when the version, the membership, every loaded row and every held version match", () => {
    expect(shortcutAnswerable(seen, "v1", request, projections())).toBe(true);
  });

  it("is false when the version is missing or differs, or nothing was recorded", () => {
    expect(shortcutAnswerable(seen, null, request, projections())).toBe(false);
    expect(shortcutAnswerable(seen, "v2", request, projections())).toBe(false);
    expect(shortcutAnswerable(null, "v1", request, projections())).toBe(false);
  });

  it("is false when the membership or the held ids differ", () => {
    expect(shortcutAnswerable(seen, "v1", { ...request, membershipVersion: "m2" }, projections())).toBe(false);
    expect(shortcutAnswerable(seen, "v1", { ...request, versions: { p1: [3, 7] } }, projections())).toBe(false);
    expect(shortcutAnswerable(seen, "v1", { ...request, versions: { p1: [3, 7], p9: [0, 0] } }, projections())).toBe(false);
  });

  it("is false when a loaded row's projection is missing or moved, including a row narrowed out of the tab", () => {
    const missing = projections();
    missing.set("p3", null);
    expect(shortcutAnswerable(seen, "v1", request, missing)).toBe(false);
    const moved = projections();
    moved.set("p3", { contentVersion: 6 });
    expect(shortcutAnswerable(seen, "v1", request, moved)).toBe(false);
  });

  it("is false when a held content version differs from the one sent", () => {
    expect(shortcutAnswerable(seen, "v1", { ...request, versions: { ...request.versions, p2: [1, 0] } }, projections())).toBe(false);
  });
});
