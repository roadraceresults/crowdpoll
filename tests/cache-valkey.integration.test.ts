import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ValkeyCache } from "../src/cache/valkeyCache.js";
import { cacheContract } from "./helpers/cache-contract.js";

const url = process.env.ENV_VALKEY_URL;

describe.skipIf(!url)("valkeyCache against ENV_VALKEY_URL", () => {
  let cache: ValkeyCache;

  beforeAll(async () => {
    cache = new ValkeyCache(url!);
    await cache.waitReady(5000);
    expect(cache.isConnected()).toBe(true);
  });

  afterAll(async () => {
    await cache?.close();
  });

  cacheContract("valkeyCache", () => cache);

  it("runs the same consumer-group semantics on a real stream", async () => {
    const stream = `it:${Date.now()}`;
    await cache.xgroupCreate(stream, "writers");
    const id = await cache.xadd(stream, { pid: "p" });
    const read = await cache.xreadgroup(stream, "writers", "c", 1, 0);
    expect(read[0]?.id).toBe(id);
    await cache.xack(stream, "writers", [id]);
    expect(await cache.xpendingCount(stream, "writers")).toBe(0);
  });
});
