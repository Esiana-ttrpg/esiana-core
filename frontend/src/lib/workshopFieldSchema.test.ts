import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveWorkshopFieldSchema } from './workshopFieldSchema.js';

describe('workshopFieldSchema', () => {
  it('resolves character overview semantic fields', () => {
    const schema = resolveWorkshopFieldSchema({
      draft: {
        id: 'draft-1',
        campaignId: 'c1',
        authorUserId: 'u1',
        title: 'Aldric',
        bodyMarkdown: '',
        binding: 'anchored',
        anchorEntityIds: ['page-1'],
        createdAt: '',
        updatedAt: '',
        lastTouchedAt: '',
        draftStatus: 'active',
      },
      anchorPage: {
        id: 'page-1',
        title: 'Aldric',
        templateType: 'DEFAULT',
        metadata: {
          entityCategory: 'characters',
          profession: 'Scout',
          appearance: { pronouns: 'they/them' },
        },
        blocks: [],
      },
      flatPages: [],
      isDMUser: true,
    });

    assert.ok(schema);
    const overview = schema!.fieldGroups.find((g) => g.subviewId === 'overview');
    assert.ok(overview);
    const labels = overview!.slots.map((s) => s.label);
    assert.ok(labels.includes('Title'));
    assert.ok(labels.includes('Profession'));
    assert.ok(labels.includes('Pronouns'));
    assert.equal(labels.some((l) => l.includes('entity-hero')), false);
  });

  it('resolves organization shadow draft with title field', () => {
    const schema = resolveWorkshopFieldSchema({
      draft: {
        id: 'draft-2',
        campaignId: 'c1',
        authorUserId: 'u1',
        title: 'New Organization',
        bodyMarkdown: '',
        binding: 'shadow',
        intendedTarget: 'organization',
        fieldShadow: {
          intendedTarget: 'organization',
          templateType: 'DEFAULT',
          blocks: [],
          metadata: { entityCategory: 'organizations' },
        },
        createdAt: '',
        updatedAt: '',
        lastTouchedAt: '',
        draftStatus: 'active',
      },
      flatPages: [],
      isDMUser: true,
    });

    assert.ok(schema);
    assert.equal(schema!.surfaceKey, 'organization');
    const overview = schema!.fieldGroups.find((g) => g.subviewId === 'overview');
    assert.ok(overview);
    assert.ok(overview!.slots.some((s) => s.label === 'Title'));
  });
});
