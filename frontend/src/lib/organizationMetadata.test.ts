import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mergeOrganizationMetadata,
  parseOrganizationMetadata,
  resolveOrgStanceAt,
} from './organizationMetadata.ts';
import { normalizeRecordId } from './entityRelationTypes.ts';

describe('organizationMetadata', () => {
  it('parses relation history with stable ids', () => {
    const relationId = 'rel-1';
    const eventId = 'evt-1';
    const parsed = parseOrganizationMetadata({
      orgType: 'Guild',
      relations: [
        {
          id: relationId,
          targetOrgId: 'org-target',
          history: [
            {
              id: eventId,
              effectiveDate: { year: 400, month: null, day: null },
              relationType: 'DIPLOMATIC',
              stance: 'ALLY',
              visibility: 'PUBLIC',
            },
          ],
        },
      ],
    });

    assert.equal(parsed.orgType, 'Guild');
    assert.equal(parsed.relations.length, 1);
    assert.equal(parsed.relations[0]?.id, relationId);
    assert.equal(parsed.relations[0]?.history[0]?.id, eventId);
  });

  it('resolves stance at a given date by id-stable history', () => {
    const relation = parseOrganizationMetadata({
      relations: [
        {
          id: normalizeRecordId('rel-a'),
          targetOrgId: 'org-b',
          history: [
            {
              id: normalizeRecordId('e1'),
              effectiveDate: { year: 400, month: null, day: null },
              relationType: 'DIPLOMATIC',
              stance: 'ALLY',
              visibility: 'PUBLIC',
            },
            {
              id: normalizeRecordId('e2'),
              effectiveDate: { year: 402, month: null, day: null },
              relationType: 'DIPLOMATIC',
              stance: 'HOSTILE',
              visibility: 'PUBLIC',
            },
          ],
        },
      ],
    }).relations[0]!;

    assert.equal(
      resolveOrgStanceAt(relation, { year: 401, month: null, day: null })?.stance,
      'ALLY',
    );
    assert.equal(
      resolveOrgStanceAt(relation, { year: 402, month: null, day: null })?.stance,
      'HOSTILE',
    );
  });

  it('merges patches by field and syncs index columns', () => {
    const merged = mergeOrganizationMetadata(
      { fields: [{ key: 'Type', value: 'Old' }] },
      { orgType: 'Syndicate', region: 'Slums', parentOrgId: 'org-parent' },
      { resolvePageTitle: (id) => (id === 'org-parent' ? 'Parent Org' : null) },
    );
    const fields = merged.fields as Array<{ key: string; value: string }>;
    assert.equal(fields.find((f) => f.key === 'Type')?.value, 'Syndicate');
    assert.equal(fields.find((f) => f.key === 'Region')?.value, 'Slums');
    assert.equal(fields.find((f) => f.key === 'Parent')?.value, 'Parent Org');
  });
});
