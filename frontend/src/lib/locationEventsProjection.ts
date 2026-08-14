import { parseSceneMetadata, isSceneMetadataPresent } from '@/lib/sceneMetadata';
import type { WikiTreeNode } from '@/types/wiki';

export type LocationEventTimeBucket = 'current' | 'historical' | 'upcoming';

export interface LocationEventEntry {
  pageId: string;
  title: string;
  bucket: LocationEventTimeBucket;
  epochMinute: number | null;
  kind: 'scene' | 'session' | 'calendar';
}

export function bucketLocationEvent(
  epochMinute: number | null,
  campaignNowMinute: number | null,
): LocationEventTimeBucket {
  if (epochMinute == null || campaignNowMinute == null) return 'current';
  if (epochMinute > campaignNowMinute) return 'upcoming';
  if (epochMinute < campaignNowMinute) return 'historical';
  return 'current';
}

export function collectLocationSceneEvents(
  locationPageId: string,
  flatPages: readonly WikiTreeNode[],
  campaignNowMinute: number | null,
): LocationEventEntry[] {
  const entries: LocationEventEntry[] = [];
  for (const page of flatPages) {
    if (!isSceneMetadataPresent(page.metadata)) continue;
    const scene = parseSceneMetadata(page.metadata);
    if (scene.locationPageId !== locationPageId) continue;
    let bucket: LocationEventTimeBucket = 'current';
    if (scene.sceneStatus === 'PLANNED' || scene.sceneStatus === 'READY') {
      bucket = campaignNowMinute != null ? 'upcoming' : 'current';
    } else if (scene.sceneStatus === 'PLAYED' || scene.sceneStatus === 'SKIPPED') {
      bucket = 'historical';
    }
    entries.push({
      pageId: page.id,
      title: page.title,
      bucket,
      epochMinute: null,
      kind: 'scene',
    });
  }
  entries.sort((a, b) => {
    const ae = a.epochMinute ?? Number.MAX_SAFE_INTEGER;
    const be = b.epochMinute ?? Number.MAX_SAFE_INTEGER;
    return be - ae;
  });
  return entries;
}

export function groupLocationEventsByBucket(
  events: LocationEventEntry[],
): Record<LocationEventTimeBucket, LocationEventEntry[]> {
  return {
    current: events.filter((e) => e.bucket === 'current'),
    historical: events.filter((e) => e.bucket === 'historical'),
    upcoming: events.filter((e) => e.bucket === 'upcoming'),
  };
}
