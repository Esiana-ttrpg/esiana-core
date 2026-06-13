import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getClimateAspectHeaderIcon,
  normalizeClimateAspect,
  parseClimateAspectFromImportRow,
} from './climateAspect.js';
import { sanitizeCalendarMonths } from './timeTracking.js';

describe('normalizeClimateAspect', () => {
  it('returns NEUTRAL for unknown values', () => {
    assert.equal(normalizeClimateAspect('volcanic'), 'NEUTRAL');
    assert.equal(normalizeClimateAspect(null), 'NEUTRAL');
  });

  it('accepts valid enum tokens case-insensitively', () => {
    assert.equal(normalizeClimateAspect('arid'), 'ARID');
    assert.equal(normalizeClimateAspect('PLUVIAL'), 'PLUVIAL');
  });
});

describe('parseClimateAspectFromImportRow', () => {
  it('reads known export keys', () => {
    assert.equal(
      parseClimateAspectFromImportRow({ climate_aspect: 'CRYORIC' }),
      'CRYORIC',
    );
    assert.equal(
      parseClimateAspectFromImportRow({ weather_type: 'tempest' }),
      'TEMPEST',
    );
  });

  it('defaults to NEUTRAL when absent', () => {
    assert.equal(parseClimateAspectFromImportRow({}), 'NEUTRAL');
  });
});

describe('getClimateAspectHeaderIcon', () => {
  it('omits icon for NEUTRAL', () => {
    assert.equal(getClimateAspectHeaderIcon('NEUTRAL'), null);
    assert.equal(getClimateAspectHeaderIcon('ARID'), '☀️');
  });
});

describe('sanitizeCalendarMonths', () => {
  it('coerces invalid climateAspect to NEUTRAL', () => {
    const rows = sanitizeCalendarMonths([
      { name: 'Heat', length: 30, type: 'standard', climateAspect: 'INVALID' },
    ]);
    assert.equal(rows?.[0]?.climateAspect, 'NEUTRAL');
  });

  it('preserves valid climateAspect', () => {
    const rows = sanitizeCalendarMonths([
      { name: 'Rain', length: 28, type: 'standard', climateAspect: 'PLUVIAL' },
    ]);
    assert.equal(rows?.[0]?.climateAspect, 'PLUVIAL');
  });
});
