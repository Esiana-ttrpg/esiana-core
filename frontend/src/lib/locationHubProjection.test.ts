import { describe, expect, it } from 'vitest';
import { buildLocationPeopleSections } from '@/lib/locationHubProjection';
import type { WikiTreeNode } from '@/types/wiki';

describe('buildLocationPeopleSections', () => {
  const flatPages: WikiTreeNode[] = [
    {
      id: 'loc-city',
      title: 'City',
      parentId: null,
      metadata: { entityCategory: 'locations' },
    } as WikiTreeNode,
    {
      id: 'char-innkeeper',
      title: 'Innkeeper',
      parentId: null,
      metadata: {
        entityCategory: 'characters',
        locationRelations: [
          { locationPageId: 'loc-city', role: 'resident', featured: true },
        ],
        status: 'ALIVE',
      },
    } as WikiTreeNode,
    {
      id: 'char-missing',
      title: 'Lost Prince',
      parentId: null,
      metadata: {
        entityCategory: 'characters',
        currentLocationId: 'loc-city',
        status: 'MISSING',
      },
    } as WikiTreeNode,
  ];

  it('derives featured, residents, and last seen here', () => {
    const sections = buildLocationPeopleSections('loc-city', flatPages);
    expect(sections.featured).toHaveLength(1);
    expect(sections.featured[0]?.characterId).toBe('char-innkeeper');
    expect(sections.residents).toHaveLength(1);
    expect(sections.lastSeenHere).toHaveLength(1);
    expect(sections.lastSeenHere[0]?.missingBadge).toBe(true);
  });
});
