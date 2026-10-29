import type { AppConfig } from "../config.js";
import { MemoryCache } from "./memoryCache.js";
import { ValkeyCache } from "./valkeyCache.js";

export interface StreamEntry {
  id: string;
  fields: Record<string, string>;
}

export interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  getMany(keys: string[]): Promise<(string | null)[]>;
  setMany(entries: { key: string; value: string; ttlMs?: number }[]): Promise<void>;
  setNx(key: string, value: string, ttlMs: number): Promise<boolean>;
  /**
   * FIX008: one atomic step of a token bucket held at `key` — `capacity` tokens,
   * one back every `intervalMs`. Takes a token and returns 0, or returns the
   * milliseconds until the next token when none is left.
   */
  takeToken(key: string, capacity: number, intervalMs: number): Promise<number>;
  del(key: string): Promise<void>;
  pttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlMs: number): Promise<void>;
  hincrby(key: string, field: string, by: number): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  hgetallMany(keys: string[]): Promise<Record<string, string>[]>;
  hset(key: string, fields: Record<string, string>): Promise<void>;
  hdel(key: string, ...fields: string[]): Promise<void>;
  sadd(key: string, ...members: string[]): Promise<void>;
  sismember(key: string, member: string): Promise<boolean>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, ...members: string[]): Promise<void>;
  rename(key: string, newKey: string): Promise<boolean>;
  zadd(key: string, score: number, member: string): Promise<void>;
  zscore(key: string, member: string): Promise<number | null>;
  zcard(key: string): Promise<number>;
  zremrangebyscore(key: string, min: number, max: number): Promise<number>;
  zrem(key: string, member: string): Promise<void>;
  scan(pattern: string): Promise<string[]>;
  lock(name: string, ttlMs: number): Promise<boolean>;
  unlock(name: string): Promise<void>;
  xgroupCreate(stream: string, group: string): Promise<void>;
  xadd(stream: string, fields: Record<string, string>): Promise<string>;
  xreadgroup(
    stream: string,
    group: string,
    consumer: string,
    count: number,
    blockMs: number
  ): Promise<StreamEntry[]>;
  xack(stream: string, group: string, ids: string[]): Promise<void>;
  xautoclaim(
    stream: string,
    group: string,
    consumer: string,
    minIdleMs: number,
    count: number
  ): Promise<StreamEntry[]>;
  xpendingCount(stream: string, group: string): Promise<number>;
  xlen(stream: string): Promise<number>;
  xtrim(stream: string, minId: string): Promise<void>;
  ping(timeoutMs: number): Promise<boolean>;
  /** Resolves once the connection is usable, or rejects after the timeout. */
  waitReady(timeoutMs: number): Promise<void>;
  isConnected(): boolean;
  onDisconnect(listener: () => void): void;
  onReconnect(listener: () => void): void;
  close(): Promise<void>;
}

const CONNECT_TIMEOUT_MS = 10_000;

export async function createCache(config: Pick<AppConfig, "valkeyUrl">): Promise<Cache> {
  if (config.valkeyUrl) {
    const cache = new ValkeyCache(config.valkeyUrl);
    await cache.waitReady(CONNECT_TIMEOUT_MS);
    console.log("[cache] Using Valkey");
    return cache;
  }
  console.log("[cache] Using the in-process cache and queue");
  return new MemoryCache();
}
