import assert from 'node:assert/strict';
import test from 'node:test';
import {
  migrateWidgetId,
  normalizeDashboardConfig,
  parseDashboardLayoutPayload,
} from './dashboardConfig.js';

test('migrateWidgetId remaps legacy ids', () => {
  assert.equal(migrateWidgetId('sessionClock'), 'sessionSchedule');
  assert.equal(migrateWidgetId('worldClock'), 'worldChronometer');
  assert.equal(migrateWidgetId('announcements'), 'campaignBulletin');
  assert.equal(migrateWidgetId('activityLoop'), 'recentLore');
  assert.equal(migrateWidgetId('party'), 'party');
});

test('normalizeDashboardConfig merges duplicate legacy placements', () => {
  const normalized = normalizeDashboardConfig({
    hero: { coverImageUrl: null, summary: null },
    widgets: [
      {
        id: 'sessionClock',
        x: 0,
        y: 0,
        w: 4,
        h: 4,
        enabled: true,
        config: { note: 'from legacy' },
      },
      {
        id: 'sessionSchedule',
        x: 2,
        y: 1,
        w: 4,
        h: 4,
        enabled: false,
        config: { note: 'from canonical' },
      },
    ],
  });

  const schedule = normalized.widgets.find((w) => w.id === 'sessionSchedule');
  assert.ok(schedule);
  assert.equal(schedule.enabled, true);
  assert.deepEqual(schedule.config, { note: 'from canonical' });
  assert.equal(
    normalized.widgets.filter((w) => w.id === 'sessionSchedule').length,
    1,
  );
});

test('parseDashboardLayoutPayload accepts livingThreads widget placements', () => {
  const payload = normalizeDashboardConfig({
    hero: {
      coverImageUrl: null,
      summary: null,
      heroMode: 'cinematic',
      focalPointX: 0.5,
      focalPointY: 0.5,
      overlayStrength: 0.65,
    },
    widgets: normalizeDashboardConfig(null).widgets,
  });

  const parsed = parseDashboardLayoutPayload(payload);
  assert.ok(parsed);
  assert.ok(parsed.widgets.some((w) => w.id === 'livingThreads'));
});

test('normalizeDashboardConfig adds worldPressureForecast widget disabled by default', () => {
  const normalized = normalizeDashboardConfig({
    hero: { coverImageUrl: null, summary: null },
    widgets: [
      {
        id: 'sessionSchedule',
        x: 0,
        y: 0,
        w: 4,
        h: 4,
        enabled: true,
      },
    ],
  });

  const forecast = normalized.widgets.find((w) => w.id === 'worldPressureForecast');
  assert.ok(forecast);
  assert.equal(forecast.enabled, false);
});

test('parseDashboardLayoutPayload accepts worldPressureForecast widget placements', () => {
  const payload = normalizeDashboardConfig({
    hero: {
      coverImageUrl: null,
      summary: null,
      heroMode: 'cinematic',
      focalPointX: 0.5,
      focalPointY: 0.5,
      overlayStrength: 0.65,
    },
    widgets: normalizeDashboardConfig(null).widgets,
  });

  const parsed = parseDashboardLayoutPayload(payload);
  assert.ok(parsed);
  assert.ok(parsed.widgets.some((w) => w.id === 'worldPressureForecast'));
});
