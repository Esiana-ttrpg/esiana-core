import type { Response } from 'express';

const streams = new Map<string, Set<Response>>();
const realtimeConnections = new Map<string, Set<() => void>>();

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
  streams.delete(key);
  for (const response of bucket ?? []) {
    if (!response.writableEnded) response.end();
  }
  closeRealtimeConnections(key);
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
  for (const key of [...realtimeConnections.keys()]) {
    if (key.startsWith(prefix)) closeRealtimeConnections(key);
  }
}

/** Registers another realtime transport in the same membership-revocation boundary. */
export function registerCampaignRealtimeConnection(
  campaignId: string,
  userId: string,
  close: () => void,
): () => void {
  const key = streamKey(campaignId, userId);
  const bucket = realtimeConnections.get(key) ?? new Set<() => void>();
  bucket.add(close);
  realtimeConnections.set(key, bucket);
  return () => {
    bucket.delete(close);
    if (bucket.size === 0) realtimeConnections.delete(key);
  };
}

function closeRealtimeConnections(key: string): void {
  const bucket = realtimeConnections.get(key);
  if (!bucket) return;
  realtimeConnections.delete(key);
  for (const close of bucket) close();
}
