import { buildSlideManifest } from '../../../../../shared/wrapped/slideRegistry.js';
import type {
  WrappedPublishedPayloadV1,
  WrappedSlideManifestEntry,
  WrappedYearResponse,
} from '../../../../../shared/wrappedTypes.js';
import { Prisma } from '../../prismaClient.js';
import { prisma } from '../../prisma.js';
import { getWrappedYear } from './wrappedSnapshotService.js';
import { getWrappedFeatureFlags } from './wrappedFeatureFlags.js';

function parsePublishedPayload(raw: unknown): WrappedPublishedPayloadV1 | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as WrappedPublishedPayloadV1;
  if (body.schemaVersion !== 1 || !body.calculation || !body.presentation) {
    return null;
  }
  return body;
}

function ownerDisplayName(user: {
  displayName: string | null;
  email: string;
}): string {
  const name = user.displayName?.trim();
  if (name) return name;
  const at = user.email.indexOf('@');
  return at > 0 ? user.email.slice(0, at) : user.email;
}

export async function publishWrappedYear(input: {
  userId: string;
  year: number;
  now?: Date;
}): Promise<WrappedYearResponse> {
  const flags = await getWrappedFeatureFlags();
  if (!flags.wrappedEnabled) {
    throw Object.assign(new Error('Wrapped is disabled'), { status: 404 });
  }
  if (!flags.publicWrappedPublishingEnabled) {
    throw Object.assign(new Error('Public Wrapped publishing is disabled'), {
      status: 403,
    });
  }

  const ownerView = await getWrappedYear({
    userId: input.userId,
    year: input.year,
    now: input.now,
  });
  if ('unavailable' in ownerView && ownerView.unavailable) {
    throw Object.assign(new Error('Wrapped edition unavailable'), { status: 404 });
  }

  const response = ownerView as WrappedYearResponse;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { displayName: true, email: true },
  });
  const publishedAt = input.now ?? new Date();
  const frozen: WrappedPublishedPayloadV1 = {
    schemaVersion: 1,
    calculation: structuredClone(response.calculation),
    presentation: structuredClone(response.presentation),
  };

  await prisma.userWrappedSnapshot.update({
    where: {
      userId_year: { userId: input.userId, year: input.year },
    },
    data: {
      publishedAt,
      publishedPayload: frozen as object,
      publishedOwnerName: ownerDisplayName(user),
    },
  });

  return {
    ...response,
    publication: {
      status: 'published',
      publishedAt: publishedAt.toISOString(),
      publicPublishingEnabled: true,
    },
  };
}

export async function unpublishWrappedYear(input: {
  userId: string;
  year: number;
}): Promise<WrappedYearResponse> {
  const flags = await getWrappedFeatureFlags();
  if (!flags.wrappedEnabled) {
    throw Object.assign(new Error('Wrapped is disabled'), { status: 404 });
  }

  await prisma.userWrappedSnapshot.updateMany({
    where: { userId: input.userId, year: input.year },
    data: {
      publishedAt: null,
      publishedPayload: Prisma.DbNull,
      publishedOwnerName: null,
    },
  });

  const ownerView = await getWrappedYear({
    userId: input.userId,
    year: input.year,
  });
  if ('unavailable' in ownerView && ownerView.unavailable) {
    throw Object.assign(new Error('Wrapped edition unavailable'), { status: 404 });
  }
  return ownerView as WrappedYearResponse;
}

/**
 * Public read of a published edition. Returns null (caller → 404) when
 * unpublished, flags disable access, or payload is missing — never reveals
 * whether a private edition exists.
 */
export async function getPublicWrappedYear(input: {
  userId: string;
  year: number;
}): Promise<WrappedYearResponse | null> {
  const flags = await getWrappedFeatureFlags();
  if (!flags.wrappedEnabled || !flags.publicWrappedPublishingEnabled) {
    return null;
  }

  const row = await prisma.userWrappedSnapshot.findUnique({
    where: {
      userId_year: { userId: input.userId, year: input.year },
    },
    select: {
      publishedAt: true,
      publishedPayload: true,
      publishedOwnerName: true,
      generatedAt: true,
      regeneratedAt: true,
    },
  });

  if (!row?.publishedAt || !row.publishedPayload) {
    return null;
  }

  const frozen = parsePublishedPayload(row.publishedPayload);
  if (!frozen) return null;

  const slideManifest = buildSlideManifest(
    frozen.calculation.slideIds,
  ) as WrappedSlideManifestEntry[];

  return {
    version: 1,
    year: frozen.calculation.year,
    edition: frozen.calculation.edition,
    timeZone: frozen.calculation.timeZone,
    generatedAt: frozen.calculation.generatedAt,
    regeneratedAt: row.regeneratedAt?.toISOString() ?? null,
    access: 'public',
    owner: {
      id: input.userId,
      displayName: row.publishedOwnerName?.trim() || 'Adventurer',
    },
    calculation: frozen.calculation,
    presentation: frozen.presentation,
    slideManifest,
    publication: {
      status: 'published',
      publishedAt: row.publishedAt.toISOString(),
      publicPublishingEnabled: true,
    },
  };
}
