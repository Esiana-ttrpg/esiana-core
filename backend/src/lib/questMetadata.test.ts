import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearQuestMetadata,
  mergeQuestMetadata,
  parseQuestMetadata,
  readCategoryMetadataField,
  resolveQuestMetadataPatchInput,
  sanitizeQuestMetadataForRole,
} from './questMetadata.js';

describe('parseQuestMetadata', () => {
  it('defaults missing fields to AVAILABLE', () => {
    const parsed = parseQuestMetadata(null);
    assert.equal(parsed.questStatus, 'AVAILABLE');
    assert.equal(parsed.questGiverId, null);
    assert.equal(parsed.dmRewardsText, null);
  });

  it('parses valid status', () => {
    const parsed = parseQuestMetadata({ questStatus: 'active' });
    assert.equal(parsed.questStatus, 'ACTIVE');
  });

  it('parses boardOrder', () => {
    const parsed = parseQuestMetadata({ boardOrder: '2048.5' });
    assert.equal(parsed.boardOrder, 2048.5);
  });

  it('parses questType and questDate', () => {
    const parsed = parseQuestMetadata({
      questType: 'Side',
      questDate: { year: 1024, month: 2, day: 15 },
    });
    assert.equal(parsed.questType, 'Side');
    assert.deepEqual(parsed.questDate, { year: 1024, month: 2, day: 15 });
  });

  it('reads legacy Type from metadata.fields', () => {
    const parsed = parseQuestMetadata({
      fields: [{ key: 'Type', value: 'Main' }],
    });
    assert.equal(parsed.questType, 'Main');
  });
});

describe('readCategoryMetadataField', () => {
  it('reads Location and Progress from metadata.fields', () => {
    const metadata = {
      fields: [
        { key: 'Location', value: ' Baldur\'s Gate ' },
        { key: 'Progress', value: 'Act II' },
      ],
    };
    assert.equal(readCategoryMetadataField(metadata, 'Location'), 'Baldur\'s Gate');
    assert.equal(readCategoryMetadataField(metadata, 'Progress'), 'Act II');
    assert.equal(readCategoryMetadataField(metadata, 'Missing'), null);
  });
});

describe('mergeQuestMetadata', () => {
  it('removes questDate when patch is null', () => {
    const merged = mergeQuestMetadata(
      { questDate: { year: 1, month: 0, day: 1 } },
      { questDate: null },
    );
    assert.equal(merged.questDate, undefined);
  });

  it('preserves unrelated metadata keys', () => {
    const merged = mergeQuestMetadata(
      { fields: [{ key: 'Type', value: 'Main' }], entityCategory: 'Quests' },
      { questStatus: 'COMPLETED' },
    );
    assert.deepEqual(merged.fields, [{ key: 'Type', value: 'Main' }]);
    assert.equal(merged.entityCategory, 'Quests');
    assert.equal(merged.questStatus, 'COMPLETED');
  });
});

describe('sanitizeQuestMetadataForRole', () => {
  it('strips dmRewardsText for players', () => {
    const parsed = parseQuestMetadata({
      rewardsText: 'Gold',
      dmRewardsText: 'Secret loot',
    });
    const sanitized = sanitizeQuestMetadataForRole(parsed, false);
    assert.equal(sanitized.rewardsText, 'Gold');
    assert.equal(sanitized.dmRewardsText, null);
  });
});

describe('resolveQuestMetadataPatchInput', () => {
  it('reads nested metadata patch', () => {
    const input = resolveQuestMetadataPatchInput({
      metadata: { boardOrder: 100, questStatus: 'ACTIVE' },
    });
    assert.deepEqual(input, { boardOrder: 100, questStatus: 'ACTIVE' });
  });

  it('reads flat quest fields for backward compatibility', () => {
    const input = resolveQuestMetadataPatchInput({
      boardOrder: 2048,
    });
    assert.deepEqual(input, { boardOrder: 2048 });
  });
});

describe('clearQuestMetadata', () => {
  it('removes only quest keys', () => {
    const cleared = clearQuestMetadata({
      questStatus: 'ACTIVE',
      fields: [],
      systemCategoryKey: 'quests',
    });
    assert.equal(cleared.questStatus, undefined);
    assert.deepEqual(cleared.fields, []);
    assert.equal(cleared.systemCategoryKey, 'quests');
  });
});
