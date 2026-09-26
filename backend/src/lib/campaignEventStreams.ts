import type { Response } from 'express';

const streams = new Map<string, Set<Response>>();

function streamKey(campaignId: string, userId: string): string {
  return `${campaignId}:${userId}`;
}

export function registerCampaignEventStream(
  campaignId: string,
  userId: string,
  response: Response,
): () => void {
  const key = streamKey(campaignId, userId);
  const bucket = streams.get(key) ?? new Set<Response>();
  bucket.add(response);
  streams.set(key, bucket);
  return () => {
    bucket.delete(response);
    if (bucket.size === 0) streams.delete(key);
  };
}

/** Immediately terminates streams whose authorization context became stale. */
export function revokeCampaignEventStreams(campaignId: string, userId: string): void {
  const key = streamKey(campaignId, userId);
  const bucket = streams.get(key);
  if (!bucket) return;
  streams.delete(key);
  for (const response of bucket) {
    if (!response.writableEnded) response.end();
  }
}

export function revokeAllCampaignEventStreams(campaignId: string): void {
  const prefix = `${campaignId}:`;
  for (const key of [...streams.keys()]) {
    if (!key.startsWith(prefix)) continue;
    const bucket = streams.get(key);
    streams.delete(key);
    for (const response of bucket ?? []) {
      if (!response.writableEnded) response.end();
    }
  }
}
