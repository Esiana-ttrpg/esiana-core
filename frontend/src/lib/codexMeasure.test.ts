import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCodexMeasureTier,
  resolvePageMeasureTier,
  resolveReadableMeasureCh,
} from './codexWorkspaceUx.js';
import {
  CODEX_READABLE_CH_HYBRID,
  CODEX_READABLE_CH_STANDARD,
  READING_MEASURE_HYBRID_WIDE_CH,
  READING_MEASURE_STANDARD_STANDARD_CH,
  READING_MEASURE_TIGHT_STANDARD_CH,
} from './densityConstants.js';

describe('resolveCodexMeasureTier', () => {
  it('uses hybrid tier for narrative-reference templates', () => {
    assert.equal(resolveCodexMeasureTier('CHARACTER'), 'hybrid');
    assert.equal(resolveCodexMeasureTier('SESSION_NOTE'), 'hybrid');
    assert.equal(resolveCodexMeasureTier('ORGANIZATION'), 'hybrid');
  });

  it('uses standard tier for default lore pages', () => {
    assert.equal(resolveCodexMeasureTier('DEFAULT'), 'standard');
    assert.equal(resolveCodexMeasureTier(''), 'standard');
  });
});

describe('resolvePageMeasureTier', () => {
  it('uses hybrid tier for entity workspace surface keys', () => {
    assert.equal(resolvePageMeasureTier('character', 'DEFAULT'), 'hybrid');
    assert.equal(resolvePageMeasureTier('bestiary', 'DEFAULT'), 'hybrid');
    assert.equal(resolvePageMeasureTier('object', 'DEFAULT'), 'hybrid');
  });

  it('falls back to template tier for non-entity surfaces', () => {
    assert.equal(resolvePageMeasureTier('default', 'DEFAULT'), 'standard');
    assert.equal(resolvePageMeasureTier('quest', 'DEFAULT'), 'standard');
  });
});

describe('resolveReadableMeasureCh', () => {
  it('returns semantic caps without viewport math', () => {
    assert.equal(
      resolveReadableMeasureCh('reading', 'standard', 'standard'),
      READING_MEASURE_STANDARD_STANDARD_CH,
    );
    assert.equal(
      resolveReadableMeasureCh('reading', 'wide', 'hybrid'),
      READING_MEASURE_HYBRID_WIDE_CH,
    );
    assert.equal(
      resolveReadableMeasureCh('reading', 'standard', 'tight'),
      READING_MEASURE_TIGHT_STANDARD_CH,
    );
  });

  it('keeps hybrid tier at or below the hybrid cap', () => {
    assert.ok(
      resolveReadableMeasureCh('reading', 'wide', 'hybrid') <= CODEX_READABLE_CH_HYBRID,
    );
    assert.ok(
      resolveReadableMeasureCh('reading', 'standard', 'standard') <= CODEX_READABLE_CH_STANDARD,
    );
  });
});
