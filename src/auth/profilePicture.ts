import { createHash, randomBytes } from "node:crypto";
import type { AppConfig } from "../config.js";
import type { Db } from "../db/client.js";
import type { ObjectStore } from "../trending/publish.js";

export const DEFAULT_AVATAR = "/avatar-default.svg";

const OBJECT_KEY_PREFIX = "avatars/";
const PICTURE_MAX_BYTES = 256 * 1024;
const PICTURE_TIME_LIMIT_MS = 3000;
const PICTURE_CACHE_CONTROL = "public, max-age=86400, immutable";
const GOOGLE_PICTURE_HOST = "googleusercontent.com";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

export interface Picture {
  bytes: Buffer;
  contentType: string;
}

interface PictureDeps {
  db: Db;
  store: ObjectStore;
}

/** A refusal this module decided; its message never carries the picture's address. */
class PictureRefused extends Error {}

/** The `picture` claim: https://developers.google.com/identity/openid-connect/reference#an-id-tokens-payload */
export function pictureClaim(idToken: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8")) as { picture?: unknown };
    return typeof payload.picture === "string" ? payload.picture : null;
  } catch {
    return null;
  }
}

export function allowedPictureUrl(address: string): string | null {
  if (!URL.canParse(address)) return null;
  const { protocol, hostname } = new URL(address);
  const onPictureHost = hostname === GOOGLE_PICTURE_HOST || hostname.endsWith(`.${GOOGLE_PICTURE_HOST}`);
  return protocol === "https:" && onPictureHost ? address : null;
}

function imageContentType(bytes: Buffer): string | null {
  if (bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return "image/png";
  if (bytes.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)) return "image/jpeg";
  if (bytes.toString("latin1", 0, 4) === "RIFF" && bytes.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  return null;
}

async function readAtMost(body: ReadableStream<Uint8Array> | null, limit: number): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks);
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new PictureRefused("too large");
    }
    chunks.push(value);
  }
}

export async function fetchPicture(url: string, signal: AbortSignal): Promise<Picture> {
  const res = await fetch(url, { redirect: "error", signal });
  if (!res.ok) throw new PictureRefused(`answered ${res.status}`);
  const bytes = await readAtMost(res.body, PICTURE_MAX_BYTES);
  const contentType = imageContentType(bytes);
  if (!contentType) throw new PictureRefused("refused type");
  return { bytes, contentType };
}

export function avatarUrl(stored: string | null | undefined, config: Pick<AppConfig, "spaces">): string | null {
  if (!stored) return null;
  if (!stored.startsWith(OBJECT_KEY_PREFIX)) return stored;
  return config.spaces ? `${config.spaces.cdnUrl.replace(/\/$/, "")}/${stored}` : DEFAULT_AVATAR;
}

export async function queueAvatarRemoval(db: Db, stored: string | null | undefined): Promise<void> {
  if (!stored?.startsWith(OBJECT_KEY_PREFIX)) return;
  await db
    .insertInto("avatar_removals")
    .values({ key: stored })
    .onConflict((oc) => oc.column("key").doNothing())
    .execute();
}

async function storeProfilePicture({ db, store }: PictureDeps, userId: string, picture: Picture, signal: AbortSignal): Promise<boolean> {
  const hash = createHash("sha256").update(picture.bytes).digest("hex");
  const current = await db.selectFrom("user").select("profile_avatar_hash").where("id", "=", userId).executeTakeFirst();
  if (!current || current.profile_avatar_hash === hash) return false;

  const key = `${OBJECT_KEY_PREFIX}${randomBytes(16).toString("hex")}`;
  await store.put(key, picture.bytes, { contentType: picture.contentType, cacheControl: PICTURE_CACHE_CONTROL }, signal);

  return db.transaction().execute(async (trx) => {
    const owner = await trx.selectFrom("user").select("profileAvatar").where("id", "=", userId).forUpdate().executeTakeFirst();
    if (!owner) {
      await queueAvatarRemoval(trx, key);
      return false;
    }
    await trx.updateTable("user").set({ profileAvatar: key, profile_avatar_hash: hash }).where("id", "=", userId).execute();
    await queueAvatarRemoval(trx, owner.profileAvatar);
    return true;
  });
}

/** Says whether the account's picture changed; any failure leaves the account as it was. */
export async function refreshProfilePicture(deps: PictureDeps, userId: string): Promise<boolean> {
  const signal = AbortSignal.timeout(PICTURE_TIME_LIMIT_MS);
  try {
    const account = await deps.db
      .selectFrom("account")
      .select("idToken")
      .where("userId", "=", userId)
      .where("providerId", "=", "google")
      .orderBy("updatedAt", "desc")
      .executeTakeFirst();
    const claim = account?.idToken ? pictureClaim(account.idToken) : null;
    if (!claim) return false;
    const url = allowedPictureUrl(claim);
    if (!url) throw new PictureRefused("host refused");
    const changed = await storeProfilePicture(deps, userId, await fetchPicture(url, signal), signal);
    if (changed) console.log(`[profile-picture] Stored a new picture for user ${userId}`);
    return changed;
  } catch (err) {
    const reason = err instanceof PictureRefused ? err.message : err instanceof Error ? err.name : "unknown failure";
    console.warn(`[profile-picture] Kept the current picture of user ${userId}: ${reason}`);
    return false;
  }
}
