import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MemoryCache, DisconnectedError } from "../src/cache/memoryCache.js";
import { createCache } from "../src/cache/cache.js";
import { cacheContract } from "./helpers/cache-contract.js";

let cache: MemoryCache;

beforeAll(() => {
  cache = new MemoryCache();
});

afterAll(async () => {
  await cache.close();
});

cacheContract("memoryCache", () => cache);

describe("memoryCache: disconnected switch", () => {
  it("rejects every operation while disconnected and notifies both hooks", async () => {
    const own = new MemoryCache();
    const events: string[] = [];
    own.onDisconnect(() => events.push("down"));
    own.onReconnect(() => events.push("up"));
    own.setDisconnected(true);
    expect(own.isConnected()).toBe(false);
    expect(await own.ping(10)).toBe(false);
    await expect(own.get("k")).rejects.toBeInstanceOf(DisconnectedError);
    await expect(own.setNx("k", "1", 10)).rejects.toBeInstanceOf(DisconnectedError);
    await expect(own.hincrby("h", "f", 1)).rejects.toBeInstanceOf(DisconnectedError);
    await expect(own.xadd("s", { a: "1" })).rejects.toBeInstanceOf(DisconnectedError);
    own.setDisconnected(false);
    expect(own.isConnected()).toBe(true);
    await own.set("k", "1");
    expect(await own.get("k")).toBe("1");
    expect(events).toEqual(["down", "up"]);
  });
});

describe("createCache", () => {
  it("selects the in-process cache when ENV_VALKEY_URL is unset", async () => {
    expect(await createCache({ valkeyUrl: undefined })).toBeInstanceOf(MemoryCache);
  });
});
