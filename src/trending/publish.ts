import { gzipSync } from "node:zlib";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { SpacesConfig } from "../config.js";
import type { TrendingListing } from "./recompute.js";

export interface ListingObjects {
  counts: string;
  cards: string;
}

export const TRENDING_OBJECTS: ListingObjects = { counts: "trending-counts.json", cards: "trending.json" };
export const NEWEST_OBJECTS: ListingObjects = { counts: "newest-counts.json", cards: "newest.json" };

export interface ObjectStore {
  put(key: string, body: Buffer, headers: { contentType: string; cacheControl: string; contentEncoding?: string }): Promise<void>;
}

// Spaces speaks the S3 API: https://docs.digitalocean.com/products/spaces/reference/s3-sdk-examples/
export function createSpacesStore(spaces: SpacesConfig): ObjectStore {
  const client = new S3Client({
    region: spaces.region,
    endpoint: `https://${spaces.region}.digitaloceanspaces.com`,
    forcePathStyle: false,
    credentials: { accessKeyId: spaces.key, secretAccessKey: spaces.secret }
  });
  return {
    async put(key, body, headers) {
      await client.send(
        new PutObjectCommand({
          Bucket: spaces.bucket,
          Key: key,
          Body: body,
          ACL: "public-read",
          ContentType: headers.contentType,
          CacheControl: headers.cacheControl,
          ContentEncoding: headers.contentEncoding
        })
      );
    }
  };
}

export interface Publisher {
  /** Publishes the counts object every time and the cards object only when a poll joined, left or changed. */
  publish(listing: TrendingListing): Promise<{ counts: boolean; cards: boolean }>;
}

export function createListingPublisher(store: ObjectStore | null, intervalMs: number, objects: ListingObjects): Publisher {
  let lastCardsVersion: string | null = null;
  const cacheControl = `public, max-age=${Math.floor(intervalMs / 1000)}`;
  const headers = { contentType: "application/json; charset=utf-8", cacheControl, contentEncoding: "gzip" };
  return {
    async publish(listing) {
      if (!store) return { counts: false, cards: false };
      await store.put(objects.counts, gzipSync(JSON.stringify(listing.countsObject)), headers);
      const cardsChanged = listing.cardsVersion !== lastCardsVersion;
      if (cardsChanged) {
        await store.put(objects.cards, gzipSync(JSON.stringify(listing.cardsObject)), headers);
        lastCardsVersion = listing.cardsVersion;
      }
      return { counts: true, cards: cardsChanged };
    }
  };
}
