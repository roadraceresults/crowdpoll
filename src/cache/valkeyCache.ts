import { Valkey } from "iovalkey";
import type { Cache, StreamEntry } from "./cache.js";

const COMMAND_TIMEOUT_MS = 100;

type RawStreamEntry = [string, string[]];

function toEntry([id, flat]: RawStreamEntry): StreamEntry {
  const fields: Record<string, string> = {};
  for (let i = 0; i + 1 < flat.length; i += 2) fields[flat[i]!] = flat[i + 1]!;
  return { id, fields };
}

// iovalkey is API-compatible with ioredis: https://github.com/valkey-io/iovalkey
/**
 * FIX008: the token bucket step, run on the server so every instance sees one
 * bucket per user and kind. Mirrors refillBucket() in memoryCache.ts.
 * KEYS[1] bucket; ARGV capacity, intervalMs, nowMs. Returns 0 (taken) or the wait.
 */
const TAKE_TOKEN_LUA = `
local capacity = tonumber(ARGV[1])
local interval = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local tokens, at = capacity, now
local held = redis.call('GET', KEYS[1])
if held then
  local sep = string.find(held, ':', 1, true)
  tokens = tonumber(string.sub(held, 1, sep - 1))
  at = tonumber(string.sub(held, sep + 1))
  local earned = math.floor((now - at) / interval)
  if earned > 0 then
    tokens = tokens + earned
    at = at + earned * interval
  end
  if tokens >= capacity then
    tokens = capacity
    at = now
  end
end
if tokens < 1 then
  return math.max(1, at + interval - now)
end
redis.call('SET', KEYS[1], (tokens - 1) .. ':' .. at, 'PX', (capacity + 1) * interval)
return 0
`;

export class ValkeyCache implements Cache {
  private readonly client: Valkey;
  private blockingClient: Valkey | null = null;
  private connected = false;
  private readonly disconnectListeners: Array<() => void> = [];
  private readonly reconnectListeners: Array<() => void> = [];

  constructor(private readonly url: string) {
    this.client = new Valkey(url, {
      commandTimeout: COMMAND_TIMEOUT_MS,
      maxRetriesPerRequest: 0,
      enableOfflineQueue: false,
      lazyConnect: false
    });
    this.client.on("ready", () => {
      const wasConnected = this.connected;
      this.connected = true;
      console.log("[cache] Valkey ready");
      if (!wasConnected) for (const l of this.reconnectListeners) l();
    });
    const down = (reason: string) => {
      if (!this.connected) return;
      this.connected = false;
      console.error(`[cache] Valkey ${reason}`);
      for (const l of this.disconnectListeners) l();
    };
    this.client.on("end", () => down("connection ended"));
    this.client.on("close", () => down("connection closed"));
    this.client.on("error", (err: Error) => {
      console.error(`[cache] Valkey error: ${err.message}`);
    });
  }

  /** A second connection for the consumer's blocking reads, so they never hold up other commands. */
  private async blocking(): Promise<Valkey> {
    if (!this.blockingClient) {
      this.blockingClient = new Valkey(this.url, {
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false
      });
      this.blockingClient.on("error", (err: Error) => {
        console.error(`[cache] Valkey (blocking) error: ${err.message}`);
      });
    }
    const client = this.blockingClient;
    if (client.status !== "ready") {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Valkey (blocking) connection not ready")), 2000);
        client.once("ready", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
    return client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (ttlMs) await this.client.set(key, value, "PX", ttlMs);
    else await this.client.set(key, value);
  }

  async getMany(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    return this.client.mget(...keys);
  }

  async setMany(entries: { key: string; value: string; ttlMs?: number }[]): Promise<void> {
    if (entries.length === 0) return;
    const pipeline = this.client.pipeline();
    for (const { key, value, ttlMs } of entries) {
      if (ttlMs) pipeline.set(key, value, "PX", ttlMs);
      else pipeline.set(key, value);
    }
    for (const [err] of (await pipeline.exec()) ?? []) if (err) throw err;
  }

  async setNx(key: string, value: string, ttlMs: number): Promise<boolean> {
    return (await this.client.set(key, value, "PX", ttlMs, "NX")) === "OK";
  }

  async takeToken(key: string, capacity: number, intervalMs: number): Promise<number> {
    const wait = await this.client.eval(TAKE_TOKEN_LUA, 1, key, String(capacity), String(intervalMs), String(Date.now()));
    return Number(wait);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async pttl(key: string): Promise<number> {
    return this.client.pttl(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, ttlMs: number): Promise<void> {
    await this.client.pexpire(key, ttlMs);
  }

  async hincrby(key: string, field: string, by: number): Promise<number> {
    return this.client.hincrby(key, field, by);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hgetallMany(keys: string[]): Promise<Record<string, string>[]> {
    if (keys.length === 0) return [];
    const pipeline = this.client.pipeline();
    for (const key of keys) pipeline.hgetall(key);
    const results = (await pipeline.exec()) ?? [];
    return results.map(([err, value]: [Error | null, unknown]) => {
      if (err) throw err;
      return value as Record<string, string>;
    });
  }

  async hset(key: string, fields: Record<string, string>): Promise<void> {
    await this.client.hset(key, fields);
  }

  async hdel(key: string, ...fields: string[]): Promise<void> {
    if (fields.length > 0) await this.client.hdel(key, ...fields);
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    if (members.length > 0) await this.client.sadd(key, ...members);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    return (await this.client.sismember(key, member)) === 1;
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    if (members.length > 0) await this.client.srem(key, ...members);
  }

  async rename(key: string, newKey: string): Promise<boolean> {
    try {
      await this.client.rename(key, newKey);
      return true;
    } catch (err) {
      if (err instanceof Error && err.message.includes("no such key")) return false;
      throw err;
    }
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, score, member);
  }

  async zscore(key: string, member: string): Promise<number | null> {
    const score = await this.client.zscore(key, member);
    return score === null ? null : Number(score);
  }

  async zcard(key: string): Promise<number> {
    return this.client.zcard(key);
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    return this.client.zremrangebyscore(key, min, max);
  }

  async zrem(key: string, member: string): Promise<void> {
    await this.client.zrem(key, member);
  }

  async scan(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [next, batch] = await this.client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      keys.push(...batch);
      cursor = next;
    } while (cursor !== "0");
    return keys;
  }

  async lock(name: string, ttlMs: number): Promise<boolean> {
    return this.setNx(`lock:${name}`, "1", ttlMs);
  }

  async unlock(name: string): Promise<void> {
    await this.del(`lock:${name}`);
  }

  async xgroupCreate(stream: string, group: string): Promise<void> {
    try {
      await this.client.xgroup("CREATE", stream, group, "$", "MKSTREAM");
    } catch (err) {
      if (!(err instanceof Error && err.message.includes("BUSYGROUP"))) throw err;
    }
  }

  async xadd(stream: string, fields: Record<string, string>): Promise<string> {
    const flat = Object.entries(fields).flat();
    const id = await this.client.xadd(stream, "*", ...flat);
    return id ?? "";
  }

  async xreadgroup(stream: string, group: string, consumer: string, count: number, blockMs: number): Promise<StreamEntry[]> {
    // BLOCK 0 would wait forever; a non-positive wait reads without blocking.
    const raw = (blockMs > 0
      ? await (await this.blocking()).xreadgroup("GROUP", group, consumer, "COUNT", count, "BLOCK", blockMs, "STREAMS", stream, ">")
      : await this.client.xreadgroup("GROUP", group, consumer, "COUNT", count, "STREAMS", stream, ">")) as
      | Array<[string, RawStreamEntry[]]>
      | null;
    if (!raw) return [];
    return raw.flatMap(([, entries]) => entries.map(toEntry));
  }

  async xack(stream: string, group: string, ids: string[]): Promise<void> {
    if (ids.length > 0) await this.client.xack(stream, group, ...ids);
  }

  async xautoclaim(stream: string, group: string, consumer: string, minIdleMs: number, count: number): Promise<StreamEntry[]> {
    const raw = (await this.client.xautoclaim(stream, group, consumer, minIdleMs, "0-0", "COUNT", count)) as [
      string,
      RawStreamEntry[],
      string[]?
    ];
    return raw[1].map(toEntry);
  }

  async xpendingCount(stream: string, group: string): Promise<number> {
    const summary = (await this.client.xpending(stream, group)) as [number, ...unknown[]];
    return summary[0] ?? 0;
  }

  async xlen(stream: string): Promise<number> {
    return this.client.xlen(stream);
  }

  async xtrim(stream: string, minId: string): Promise<void> {
    await this.client.xtrim(stream, "MINID", minId);
  }

  async ping(timeoutMs: number): Promise<boolean> {
    if (!this.connected) return false;
    try {
      const reply = await Promise.race([
        this.client.ping(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs).unref())
      ]);
      return reply === "PONG";
    } catch {
      return false;
    }
  }

  async waitReady(timeoutMs: number): Promise<void> {
    if (this.connected) return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Valkey at ${this.url} not ready within ${timeoutMs}ms`)), timeoutMs);
      this.client.once("ready", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  onDisconnect(listener: () => void): void {
    this.disconnectListeners.push(listener);
  }

  onReconnect(listener: () => void): void {
    this.reconnectListeners.push(listener);
  }

  async close(): Promise<void> {
    this.client.disconnect();
    this.blockingClient?.disconnect();
  }
}
