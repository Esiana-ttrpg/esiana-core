import { describe, expect, it } from 'vitest';
import {
  discoveryControlLabel,
  formatDiscoveryStateLabel,
  formatWikiVisibilityLabel,
  resolvePageIdentitySubtitle,
} from '@/lib/wikiPageHeaderMeta';
import type { WikiPlayerEntry, WikiTreeNode } from '@/types/wiki';

function makeNode(
  id: string,
  title: string,
  parentId: string | null,
): WikiTreeNode {
  return {
    id,
    campaignId: 'camp',
    title,
    parentId,
    visibility: 'Party',
    featuredImageId: null,
    templateType: 'DEFAULT',
    children: [],
    createdAt: '',
    updatedAt: '',
  };
}

describe('wikiPageHeaderMeta', () => {
  it('formats visibility for humans', () => {
    expect(formatWikiVisibilityLabel('Party')).toBe('Visible to party');
    expect(formatWikiVisibilityLabel('DM_Only')).toBe('DM only');
  });

  it('formats discovery state', () => {
    expect(formatDiscoveryStateLabel('HIDDEN')).toBe('Hidden from party');
    expect(discoveryControlLabel('REVEALED')).toBe('Discovery: Revealed');
  });

  it('shows played-by for linked party characters', () => {
    const players: WikiPlayerEntry[] = [
      {
        id: 'u1',
        label: 'Alex',
        role: 'PLAYER',
        identityPageId: 'char-1',
      },
    ];
    const subtitle = resolvePageIdentitySubtitle({
      pageId: 'char-1',
      profileKey: 'character',
      templateType: 'DEFAULT',
      profession: 'Scout merchant',
      players,
      flatPages: [
        makeNode('world', 'World', null),
        makeNode('chars', 'Characters', 'world'),
        makeNode('char-1', 'Salt Bay', 'chars'),
      ],
    });
    expect(subtitle).toBe('Played by Alex · Scout merchant');
  });

  it('omits player character label for NPCs under Characters folder', () => {
    const subtitle = resolvePageIdentitySubtitle({
      pageId: 'npc-1',
      profileKey: 'character',
      templateType: 'DEFAULT',
      profession: 'Innkeeper',
      players: [],
      flatPages: [
        makeNode('world', 'World', null),
        makeNode('chars', 'Characters', 'world'),
        makeNode('npc-1', 'Goomba', 'chars'),
      ],
    });
    expect(subtitle).toBe('Innkeeper');
  });
});
