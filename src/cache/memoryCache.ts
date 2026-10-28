import type { Cache, StreamEntry } from "./cache.js";

interface Expiring {
  expiresAt: number | null;
}

interface StringEntry extends Expiring {
  kind: "string";
  value: string;
}

interface HashEntry extends Expiring {
  kind: "hash";
  fields: Map<string, string>;
}

interface SetEntry extends Expiring {
  kind: "set";
  members: Set<string>;
}

interface ZSetEntry extends Expiring {
  kind: "zset";
  scores: Map<string, number>;
}

type Entry = StringEntry | HashEntry | SetEntry | ZSetEntry;

interface PendingEntry {
  entry: StreamEntry;
  consumer: string;
  deliveredAt: number;
}

interface StreamGroup {
  lastDelivered: number;
  pending: Map<string, PendingEntry>;
}

interface Stream {
  entries: StreamEntry[];
  sequence: number;
  groups: Map<string, StreamGroup>;
}

export class DisconnectedError extends Error {
  constructor() {
    super("cache disconnected");
  }
}

/** The bucket's stored form is `tokens:refillClockMs`. */
export function parseBucket(value: string): { tokens: number; at: number } {
  const [tokens, at] = value.split(":").map(Number);
  return { tokens: tokens || 0, at: at || 0 };
}

/**
 * Credits the tokens earned since the refill clock was last advanced; a full
 * bucket restarts the clock now so the first spend is charged from that moment.
 */
export function refillBucket(
  tokens: number,
  at: number,
  capacity: number,
  intervalMs: number,
  now: number
): { tokens: number; at: number } {
  const earned = Math.floor((now - at) / intervalMs);
  if (earned > 0) {
    tokens += earned;
    at += earned * intervalMs;
  }
  if (tokens >= capacity) return { tokens: capacity, at: now };
  return { tokens, at };
}

export class MemoryCache implements Cache {
  private readonly entries = new Map<string, Entry>();
  private readonly streams = new Map<string, Stream>();
  private connected = true;
  private readonly disconnectListeners: Array<() => void> = [];
  private readonly reconnectListeners: Array<() => void> = [];

  setDisconnected(disconnected: boolean): void {
    const wasConnected = this.connected;
    this.connected = !disconnected;
    if (wasConnected && disconnected) for (const l of this.disconnectListeners) l();
    if (!wasConnected && !disconnected) for (const l of this.reconnectListeners) l();
  }

  private live<T extends Entry>(key: string, kind: T["kind"]): T | undefined {
    if (!this.connected) throw new DisconnectedError();
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    if (entry.kind !== kind) throw new Error(`WRONGTYPE ${key} is a ${entry.kind}, not a ${kind}`);
    return entry as T;
  }

  private hash(key: string): HashEntry {
    let entry = this.live<HashEntry>(key, "hash");
    if (!entry) {
      entry = { kind: "hash", fields: new Map(), expiresAt: null };
      this.entries.set(key, entry);
    }
    return entry;
  }

  private set_(key: string): SetEntry {
    let entry = this.live<SetEntry>(key, "set");
    if (!entry) {
      entry = { kind: "set", members: new Set(), expiresAt: null };
      this.entries.set(key, entry);
    }
    return entry;
  }

  private zset(key: string): ZSetEntry {
    let entry = this.live<ZSetEntry>(key, "zset");
    if (!entry) {
      entry = { kind: "zset", scores: new Map(), expiresAt: null };
      this.entries.set(key, entry);
    }
    return entry;
  }

  async get(key: string): Promise<string | null> {
    return this.live<StringEntry>(key, "string")?.value ?? null;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (!this.connected) throw new DisconnectedError();
    this.entries.set(key, { kind: "string", value, expiresAt: ttlMs ? Date.now() + ttlMs : null });
  }

  async setNx(key: string, value: string, ttlMs: number): Promise<boolean> {
    if (this.live<StringEntry>(key, "string")) return false;
    this.entries.set(key, { kind: "string", value, expiresAt: Date.now() + ttlMs });
    return true;
  }

  async takeToken(key: string, capacity: number, intervalMs: number): Promise<number> {
    if (!this.connected) throw new DisconnectedError();
    const now = Date.now();
    const entry = this.live<StringEntry>(key, "string");
    let { tokens, at } = entry ? parseBucket(entry.value) : { tokens: capacity, at: now };
    ({ tokens, at } = refillBucket(tokens, at, capacity, intervalMs, now));
    if (tokens < 1) return Math.max(1, at + intervalMs - now);
    this.entries.set(key, { kind: "string", value: `${tokens - 1}:${at}`, expiresAt: now + (capacity + 1) * intervalMs });
    return 0;
  }

  async del(key: string): Promise<void> {
    if (!this.connected) throw new DisconnectedError();
    this.entries.delete(key);
  }

  async pttl(key: string): Promise<number> {
    if (!this.connected) throw new DisconnectedError();
    const entry = this.entries.get(key);
    if (!entry) return -2;
    if (entry.expiresAt === null) return -1;
    const remaining = entry.expiresAt - Date.now();
    if (remaining <= 0) {
      this.entries.delete(key);
      return -2;
    }
    return remaining;
  }

  async incr(key: string): Promise<number> {
    const entry = this.live<StringEntry>(key, "string");
    const next = (entry ? Number(entry.value) : 0) + 1;
    if (entry) entry.value = String(next);
    else this.entries.set(key, { kind: "string", value: String(next), expiresAt: null });
    return next;
  }

  async expire(key: string, ttlMs: number): Promise<void> {
    if (!this.connected) throw new DisconnectedError();
    const entry = this.entries.get(key);
    if (entry) entry.expiresAt = Date.now() + ttlMs;
  }

  async hincrby(key: string, field: string, by: number): Promise<number> {
    const entry = this.hash(key);
    const next = Number(entry.fields.get(field) ?? 0) + by;
    entry.fields.set(field, String(next));
    return next;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const entry = this.live<HashEntry>(key, "hash");
    return entry ? Object.fromEntries(entry.fields) : {};
  }

  async hgetallMany(keys: string[]): Promise<Record<string, string>[]> {
    return Promise.all(keys.map((k) => this.hgetall(k)));
  }

  async hset(key: string, fields: Record<string, string>): Promise<void> {
    const entry = this.hash(key);
    for (const [field, value] of Object.entries(fields)) entry.fields.set(field, value);
  }

  async hdel(key: string, ...fields: string[]): Promise<void> {
    const entry = this.live<HashEntry>(key, "hash");
    if (!entry) return;
    for (const field of fields) entry.fields.delete(field);
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    const entry = this.set_(key);
    for (const m of members) entry.members.add(m);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    return this.live<SetEntry>(key, "set")?.members.has(member) ?? false;
  }

  async smembers(key: string): Promise<string[]> {
    return [...(this.live<SetEntry>(key, "set")?.members ?? [])];
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    const entry = this.live<SetEntry>(key, "set");
    if (!entry) return;
    for (const m of members) entry.members.delete(m);
  }

  async rename(key: string, newKey: string): Promise<boolean> {
    if (!this.connected) throw new DisconnectedError();
    const entry = this.entries.get(key);
    if (!entry) return false;
    this.entries.delete(key);
    this.entries.set(newKey, entry);
    return true;
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    this.zset(key).scores.set(member, score);
  }

  async zscore(key: string, member: string): Promise<number | null> {
    return this.live<ZSetEntry>(key, "zset")?.scores.get(member) ?? null;
  }

  async zcard(key: string): Promise<number> {
    return this.live<ZSetEntry>(key, "zset")?.scores.size ?? 0;
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    const entry = this.live<ZSetEntry>(key, "zset");
    if (!entry) return 0;
    let removed = 0;
    for (const [member, score] of entry.scores) {
      if (score >= min && score <= max) {
        entry.scores.delete(member);
        removed += 1;
      }
    }
    return removed;
  }

  async zrem(key: string, member: string): Promise<void> {
    this.live<ZSetEntry>(key, "zset")?.scores.delete(member);
  }

  async scan(pattern: string): Promise<string[]> {
    if (!this.connected) throw new DisconnectedError();
    const re = new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
    const now = Date.now();
    const keys: string[] = [];
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) continue;
      if (re.test(key)) keys.push(key);
    }
    return keys;
  }

  async lock(name: string, ttlMs: number): Promise<boolean> {
    return this.setNx(`lock:${name}`, "1", ttlMs);
  }

  async unlock(name: string): Promise<void> {
    await this.del(`lock:${name}`);
  }

  private stream(name: string): Stream {
    if (!this.connected) throw new DisconnectedError();
    let stream = this.streams.get(name);
    if (!stream) {
      stream = { entries: [], sequence: 0, groups: new Map() };
      this.streams.set(name, stream);
    }
    return stream;
  }

  async xgroupCreate(stream: string, group: string): Promise<void> {
    const s = this.stream(stream);
    if (!s.groups.has(group)) s.groups.set(group, { lastDelivered: 0, pending: new Map() });
  }

  async xadd(stream: string, fields: Record<string, string>): Promise<string> {
    const s = this.stream(stream);
    s.sequence += 1;
    const id = `${Date.now()}-${s.sequence}`;
    s.entries.push({ id, fields: { ...fields } });
    return id;
  }

  private sequenceOf(id: string): number {
    return Number(id.split("-")[1]);
  }

  async xreadgroup(stream: string, group: string, consumer: string, count: number, blockMs: number): Promise<StreamEntry[]> {
    const s = this.stream(stream);
    const g = s.groups.get(group);
    if (!g) throw new Error(`NOGROUP ${group} on ${stream}`);
    const fresh = s.entries.filter((e) => this.sequenceOf(e.id) > g.lastDelivered).slice(0, count);
    if (fresh.length === 0 && blockMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(blockMs, 50)));
      return this.xreadgroup(stream, group, consumer, count, 0);
    }
    const now = Date.now();
    for (const entry of fresh) {
      g.lastDelivered = this.sequenceOf(entry.id);
      g.pending.set(entry.id, { entry, consumer, deliveredAt: now });
    }
    return fresh.map((e) => ({ id: e.id, fields: { ...e.fields } }));
  }

  async xack(stream: string, group: string, ids: string[]): Promise<void> {
    const g = this.stream(stream).groups.get(group);
    if (!g) return;
    for (const id of ids) g.pending.delete(id);
  }

  async xautoclaim(stream: string, group: string, consumer: string, minIdleMs: number, count: number): Promise<StreamEntry[]> {
    const g = this.stream(stream).groups.get(group);
    if (!g) return [];
    const now = Date.now();
    const claimed: StreamEntry[] = [];
    for (const pending of g.pending.values()) {
      if (claimed.length >= count) break;
      if (now - pending.deliveredAt < minIdleMs) continue;
      pending.consumer = consumer;
      pending.deliveredAt = now;
      claimed.push({ id: pending.entry.id, fields: { ...pending.entry.fields } });
    }
    return claimed;
  }

  async xpendingCount(stream: string, group: string): Promise<number> {
    return this.stream(stream).groups.get(group)?.pending.size ?? 0;
  }

  async xlen(stream: string): Promise<number> {
    return this.stream(stream).entries.length;
  }

  async xtrim(stream: string, minId: string): Promise<void> {
    const s = this.stream(stream);
    const min = this.sequenceOf(minId);
    s.entries = s.entries.filter((e) => this.sequenceOf(e.id) >= min);
  }

  async ping(): Promise<boolean> {
    return this.connected;
  }

  async waitReady(): Promise<void> {
    if (!this.connected) throw new DisconnectedError();
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
    this.entries.clear();
    this.streams.clear();
  }
}
