import { describe, expect, it } from 'vitest';
import { sortCampaignsByName } from './sortCampaignsByName.js';
import type { CampaignSummary } from '@/types/campaign';

function campaign(name: string, id = name.toLowerCase()): CampaignSummary {
  return {
    id,
    handle: id,
    name,
    description: null,
    discoverability: 'PRIVATE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    role: 'GAMEMASTER',
    isMember: true,
  };
}

describe('sortCampaignsByName', () => {
  it('sorts campaigns alphabetically without moving active campaign to top', () => {
    const input = [campaign('Somerden'), campaign('Arcanum'), campaign('Westreach')];
    const result = sortCampaignsByName(input).map((c) => c.name);

    expect(result).toEqual(['Arcanum', 'Somerden', 'Westreach']);
  });
});
