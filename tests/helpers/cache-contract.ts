import { describe, expect, it } from "vitest";
import type { Cache } from "../../src/cache/cache.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The behaviour every Cache implementation must share; keys are prefixed per run. */
export function cacheContract(name: string, getCache: () => Cache): void {
  const p = `t:${Math.random().toString(36).slice(2)}:`;

  describe(`${name}: strings and expiry`, () => {
    it("get/set/del round-trip and report missing keys as null", async () => {
      const cache = getCache();
      expect(await cache.get(`${p}a`)).toBeNull();
      await cache.set(`${p}a`, "1");
      expect(await cache.get(`${p}a`)).toBe("1");
      await cache.del(`${p}a`);
      expect(await cache.get(`${p}a`)).toBeNull();
    });

    it("setNx wins once and reports the remaining ttl", async () => {
      const cache = getCache();
      expect(await cache.setNx(`${p}nx`, "1", 200)).toBe(true);
      expect(await cache.setNx(`${p}nx`, "2", 200)).toBe(false);
      const ttl = await cache.pttl(`${p}nx`);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(200);
      await sleep(230);
      expect(await cache.setNx(`${p}nx`, "3", 200)).toBe(true);
    });

    it("expires values after their ttl and reports -1/-2 for no-ttl and missing keys", async () => {
      const cache = getCache();
      await cache.set(`${p}ttl`, "x", 100);
      expect(await cache.get(`${p}ttl`)).toBe("x");
      await sleep(130);
      expect(await cache.get(`${p}ttl`)).toBeNull();
      expect(await cache.pttl(`${p}ttl`)).toBe(-2);
      await cache.set(`${p}forever`, "y");
      expect(await cache.pttl(`${p}forever`)).toBe(-1);
    });

    it("takeToken hands out a burst, refuses with the wait, and refills one token per interval (FIX008)", async () => {
      const cache = getCache();
      const key = `${p}bucket`;
      expect(await cache.takeToken(key, 3, 200)).toBe(0);
      expect(await cache.takeToken(key, 3, 200)).toBe(0);
      expect(await cache.takeToken(key, 3, 200)).toBe(0);
      const wait = await cache.takeToken(key, 3, 200);
      expect(wait).toBeGreaterThan(0);
      expect(wait).toBeLessThanOrEqual(200);
      await sleep(220);
      // One interval back: one token, not three.
      expect(await cache.takeToken(key, 3, 200)).toBe(0);
      expect(await cache.takeToken(key, 3, 200)).toBeGreaterThan(0);
      // A capacity of one is the plain floor.
      expect(await cache.takeToken(`${p}one`, 1, 200)).toBe(0);
      expect(await cache.takeToken(`${p}one`, 1, 200)).toBeGreaterThan(0);
      expect(await cache.pttl(key)).toBeGreaterThan(0);
    });

    it("getMany reads values in key order with null for missing or expired keys", async () => {
      const cache = getCache();
      await cache.set(`${p}m1`, "one");
      await cache.set(`${p}m3`, "three", 80);
      expect(await cache.getMany([`${p}m1`, `${p}m2`, `${p}m3`])).toEqual(["one", null, "three"]);
      await sleep(110);
      expect(await cache.getMany([`${p}m3`, `${p}m1`])).toEqual([null, "one"]);
      expect(await cache.getMany([])).toEqual([]);
    });

    it("setMany writes every entry, each with its own ttl", async () => {
      const cache = getCache();
      await cache.setMany([
        { key: `${p}s1`, value: "a" },
        { key: `${p}s2`, value: "b", ttlMs: 80 }
      ]);
      expect(await cache.getMany([`${p}s1`, `${p}s2`])).toEqual(["a", "b"]);
      expect(await cache.pttl(`${p}s1`)).toBe(-1);
      await sleep(110);
      expect(await cache.getMany([`${p}s1`, `${p}s2`])).toEqual(["a", null]);
      await cache.setMany([]);
    });

    it("incr counts from zero and expire bounds the counter", async () => {
      const cache = getCache();
      expect(await cache.incr(`${p}c`)).toBe(1);
      expect(await cache.incr(`${p}c`)).toBe(2);
      await cache.expire(`${p}c`, 100);
      await sleep(130);
      expect(await cache.incr(`${p}c`)).toBe(1);
    });

    it("rename moves a key and reports a missing source", async () => {
      const cache = getCache();
      await cache.set(`${p}r1`, "v");
      expect(await cache.rename(`${p}r1`, `${p}r2`)).toBe(true);
      expect(await cache.get(`${p}r1`)).toBeNull();
      expect(await cache.get(`${p}r2`)).toBe("v");
      expect(await cache.rename(`${p}missing`, `${p}r3`)).toBe(false);
    });

    it("scan lists keys by pattern", async () => {
      const cache = getCache();
      await cache.set(`${p}inst:a`, "1");
      await cache.set(`${p}inst:b`, "1");
      await cache.set(`${p}other`, "1");
      expect((await cache.scan(`${p}inst:*`)).sort()).toEqual([`${p}inst:a`, `${p}inst:b`]);
    });
  });

  describe(`${name}: hashes, sets and sorted sets`, () => {
    it("hincrby accumulates fields and hgetall/hgetallMany read them back", async () => {
      const cache = getCache();
      expect(await cache.hincrby(`${p}h`, "c1", 1)).toBe(1);
      expect(await cache.hincrby(`${p}h`, "c1", 2)).toBe(3);
      await cache.hincrby(`${p}h`, "total", 3);
      await cache.hset(`${p}h`, { label: "x" });
      expect(await cache.hgetall(`${p}h`)).toEqual({ c1: "3", total: "3", label: "x" });
      await cache.hdel(`${p}h`, "label");
      expect(await cache.hgetall(`${p}h`)).toEqual({ c1: "3", total: "3" });
      await cache.hset(`${p}h`, { label: "x" });
      expect(await cache.hgetallMany([`${p}h`, `${p}none`])).toEqual([{ c1: "3", total: "3", label: "x" }, {}]);
    });

    it("sets support add, membership, listing and removal", async () => {
      const cache = getCache();
      await cache.sadd(`${p}s`, "a", "b");
      expect(await cache.sismember(`${p}s`, "a")).toBe(true);
      expect(await cache.sismember(`${p}s`, "z")).toBe(false);
      expect((await cache.smembers(`${p}s`)).sort()).toEqual(["a", "b"]);
      await cache.srem(`${p}s`, "a");
      expect((await cache.smembers(`${p}s`)).sort()).toEqual(["b"]);
    });

    it("sorted sets count members and prune by score", async () => {
      const cache = getCache();
      await cache.zadd(`${p}z`, 10, "s1");
      await cache.zadd(`${p}z`, 20, "s2");
      await cache.zadd(`${p}z`, 30, "s3");
      await cache.zadd(`${p}z`, 35, "s3");
      expect(await cache.zcard(`${p}z`)).toBe(3);
      expect(await cache.zscore(`${p}z`, "s3")).toBe(35);
      expect(await cache.zscore(`${p}z`, "nobody")).toBeNull();
      expect(await cache.zremrangebyscore(`${p}z`, -Infinity, 20)).toBe(2);
      expect(await cache.zcard(`${p}z`)).toBe(1);
      await cache.zrem(`${p}z`, "s3");
      expect(await cache.zcard(`${p}z`)).toBe(0);
    });

    it("locks are exclusive until released or expired", async () => {
      const cache = getCache();
      expect(await cache.lock(`${p}l`, 500)).toBe(true);
      expect(await cache.lock(`${p}l`, 500)).toBe(false);
      await cache.unlock(`${p}l`);
      expect(await cache.lock(`${p}l`, 500)).toBe(true);
    });
  });

  describe(`${name}: streams with consumer groups`, () => {
    it("delivers each entry once per group, tracks pending until acked, and reclaims idle entries", async () => {
      const cache = getCache();
      const stream = `${p}votes`;
      await cache.xgroupCreate(stream, "writers");
      await cache.xgroupCreate(stream, "writers");
      const id1 = await cache.xadd(stream, { pid: "p1", email: "a@x" });
      const id2 = await cache.xadd(stream, { pid: "p2", email: "b@x" });
      expect(await cache.xlen(stream)).toBe(2);

      const first = await cache.xreadgroup(stream, "writers", "c1", 10, 0);
      expect(first.map((e) => e.id)).toEqual([id1, id2]);
      expect(first[0]!.fields).toEqual({ pid: "p1", email: "a@x" });
      expect(await cache.xreadgroup(stream, "writers", "c1", 10, 0)).toEqual([]);
      expect(await cache.xpendingCount(stream, "writers")).toBe(2);

      await cache.xack(stream, "writers", [id1]);
      expect(await cache.xpendingCount(stream, "writers")).toBe(1);

      expect(await cache.xautoclaim(stream, "writers", "c2", 60_000, 10)).toEqual([]);
      await sleep(60);
      const claimed = await cache.xautoclaim(stream, "writers", "c2", 50, 10);
      expect(claimed.map((e) => e.id)).toEqual([id2]);
      await cache.xack(stream, "writers", [id2]);
      expect(await cache.xpendingCount(stream, "writers")).toBe(0);

      const id3 = await cache.xadd(stream, { pid: "p3", email: "c@x" });
      await cache.xtrim(stream, id3);
      expect(await cache.xlen(stream)).toBe(1);
      const third = await cache.xreadgroup(stream, "writers", "c1", 10, 0);
      expect(third.map((e) => e.id)).toEqual([id3]);
      await cache.xack(stream, "writers", [id3]);
    });

    it("a blocking read returns empty when nothing arrives within the wait", async () => {
      const cache = getCache();
      const stream = `${p}empty`;
      await cache.xgroupCreate(stream, "writers");
      const started = Date.now();
      expect(await cache.xreadgroup(stream, "writers", "c1", 10, 100)).toEqual([]);
      expect(Date.now() - started).toBeGreaterThanOrEqual(40);
    });
  });

  describe(`${name}: connectivity`, () => {
    it("reports connected and answers ping", async () => {
      const cache = getCache();
      expect(cache.isConnected()).toBe(true);
      expect(await cache.ping(50)).toBe(true);
    });
  });
}
