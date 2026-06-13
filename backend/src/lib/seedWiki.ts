import type { Prisma } from '@prisma/client';
import { WikiVisibility } from '../types/domain.js';
import {
  buildDowntimeCategoryMetadata,
  buildNarrativeThreadsCategoryMetadata,
  buildQuestsCategoryMetadata,
  buildPartyCategoryMetadata,
} from './wikiSystemCategory.js';

export const PLAYER_SESSION_NOTES_TITLE = 'Player Session Notes';

export interface WikiSeedNode {
  title: string;
  visibility: string;
  metadata?: Record<string, unknown>;
  children?: WikiSeedNode[];
}

/** VTT-agnostic wiki skeleton seeded on every new campaign. */
export const DEFAULT_WIKI_SKELETON: WikiSeedNode[] = [
  { title: 'Quick Access', visibility: WikiVisibility.PARTY },
  {
    title: 'World',
    visibility: WikiVisibility.PARTY,
    children: [
      { title: 'Characters', visibility: WikiVisibility.PARTY },
      {
        title: 'Party',
        visibility: WikiVisibility.PARTY,
        metadata: buildPartyCategoryMetadata(),
      },
      { title: 'Bestiary', visibility: WikiVisibility.PARTY },
      { title: 'Ancestries', visibility: WikiVisibility.PARTY },
      { title: 'Organizations', visibility: WikiVisibility.PARTY },
      { title: 'Locations', visibility: WikiVisibility.PARTY },
      { title: 'Maps', visibility: WikiVisibility.PARTY },
      { title: 'Objects', visibility: WikiVisibility.PARTY },
      { title: 'Families', visibility: WikiVisibility.PARTY },
    ],
  },
  {
    title: 'Game',
    visibility: WikiVisibility.PARTY,
    children: [
      { title: 'Rules/Resources', visibility: WikiVisibility.PARTY },
      {
        title: 'Adventure',
        visibility: WikiVisibility.PARTY,
        metadata: buildQuestsCategoryMetadata(),
      },
      {
        title: 'Downtime',
        visibility: WikiVisibility.PARTY,
        metadata: buildDowntimeCategoryMetadata(),
      },
      {
        title: 'Narrative Threads',
        visibility: WikiVisibility.PARTY,
        metadata: buildNarrativeThreadsCategoryMetadata(),
      },
      { title: 'Journals', visibility: WikiVisibility.PARTY },
      { title: 'Calendars', visibility: WikiVisibility.PARTY },
      { title: 'Timelines', visibility: WikiVisibility.PARTY },
      { title: 'Events', visibility: WikiVisibility.PARTY },
    ],
  },
  { title: PLAYER_SESSION_NOTES_TITLE, visibility: WikiVisibility.PARTY },
  { title: 'Tags', visibility: WikiVisibility.PARTY },
  { title: 'Relations', visibility: WikiVisibility.PARTY },
  { title: 'Recent Changes', visibility: WikiVisibility.PARTY },
  { title: 'Settings', visibility: WikiVisibility.DM_ONLY },
];

export async function seedWikiSkeleton(
  tx: Prisma.TransactionClient,
  campaignId: string,
  nodes: WikiSeedNode[] = DEFAULT_WIKI_SKELETON,
  parentId: string | null = null,
): Promise<void> {
  for (const node of nodes) {
    const page = await tx.wikiPage.create({
      data: {
        campaignId,
        title: node.title,
        parentId,
        visibility: node.visibility,
        ...(node.metadata ? { metadata: node.metadata as never } : {}),
      },
    });

    if (node.children?.length) {
      await seedWikiSkeleton(tx, campaignId, node.children, page.id);
    }
  }
}
