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
  assert.equal(migrateWidgetId('announcements'), 'recentLore');
  assert.equal(migrateWidgetId('campaignBulletin'), 'recentLore');
  assert.equal(migrateWidgetId('activityLoop'), 'recentLore');
  assert.equal(migrateWidgetId('party'), 'partyRoster');
});

test('normalizeDashboardConfig migrates party to partyRoster', () => {
  const normalized = normalizeDashboardConfig({
    hero: { coverImageUrl: null, summary: null },
    widgets: [
      {
        id: 'party',
        x: 0,
        y: 0,
        w: 4,
        h: 4,
        enabled: true,
      },
    ],
  });

  const roster = normalized.widgets.find((w) => w.id === 'partyRoster');
  assert.ok(roster);
  assert.equal(roster.enabled, true);
  const legacyParty = normalized.widgets.find((w) => w.id === 'party');
  assert.equal(legacyParty, undefined);
});

test('normalizeDashboardConfig migrates campaignBulletin to recentLore', () => {
  const normalized = normalizeDashboardConfig({
    hero: { coverImageUrl: null, summary: null },
    widgets: [
      {
        id: 'campaignBulletin',
        x: 0,
        y: 0,
        w: 6,
        h: 4,
        enabled: true,
        config: { body: 'House rules here' },
      },
    ],
  });

  const recentLore = normalized.widgets.find((w) => w.id === 'recentLore');
  assert.ok(recentLore);
  assert.deepEqual(recentLore.config, { body: 'House rules here' });
  const bulletin = normalized.widgets.find((w) => w.id === 'campaignBulletin');
  assert.equal(bulletin, undefined);
});

test('parseDashboardLayoutPayload rejects quickUtilityNav with more than 7 links', () => {
  const payload = {
    hero: {
      coverImageUrl: null,
      summary: null,
      heroMode: 'cinematic',
      focalPointX: 0.5,
      focalPointY: 0.5,
      overlayStrength: 0.65,
    },
    widgets: [
      {
        id: 'quickUtilityNav',
        x: 0,
        y: 0,
        w: 3,
        h: 4,
        enabled: true,
        config: {
          links: [
            'codex',
            'sessionNotes',
            'chronology',
            'party',
            'maps',
            'threads',
            'adventures',
            'recruitment',
          ],
        },
      },
    ],
  };

  assert.equal(parseDashboardLayoutPayload(payload), null);
});

test('normalizeDashboardConfig merges duplicate legacy placements', () => {
  const normalized = normalizeDashboardConfig({
    hero: { coverImageUrl: null, summary: null },
    widgets: [
      {
        id: 'campaignAtAGlance',
        x: 0,
        y: 0,
        w: 12,
        h: 2,
        enabled: true,
      },
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

test('normalizeDashboardConfig migrates legacy layouts to narrative briefing widgets', () => {
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

  for (const id of [
    'campaignAtAGlance',
    'currentStory',
    'partyRoster',
    'recentActivity',
    'explore',
  ] as const) {
    const widget = normalized.widgets.find((w) => w.id === id);
    assert.ok(widget, `expected ${id} widget`);
    assert.equal(widget.enabled, true);
  }

  assert.equal(
    normalized.widgets.find((w) => w.id === 'sessionSchedule')?.enabled,
    false,
  );
});

test('getDefaultDashboardConfig enables narrative briefing widgets', () => {
  const defaults = normalizeDashboardConfig(null);
  for (const id of [
    'campaignAtAGlance',
    'currentStory',
    'partyRoster',
    'recentActivity',
    'explore',
  ] as const) {
    const widget = defaults.widgets.find((w) => w.id === id);
    assert.ok(widget, `expected ${id} widget`);
    assert.equal(widget.enabled, true);
  }
});


test('parseDashboardLayoutPayload accepts narrative briefing widget placements', () => {
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
  for (const id of [
    'campaignAtAGlance',
    'currentStory',
    'partyRoster',
    'recentActivity',
    'explore',
  ] as const) {
    assert.ok(parsed.widgets.some((w) => w.id === id), `expected ${id} in layout`);
  }
});

test('normalizeDashboardConfig adds world widget bank entries disabled by default', () => {
  const normalized = normalizeDashboardConfig(null);
  for (const id of ['recentEntities', 'worldEvents', 'factionsAtWar'] as const) {
    const widget = normalized.widgets.find((w) => w.id === id);
    assert.ok(widget, `expected ${id} widget`);
    assert.equal(widget.enabled, false);
  }
});

test('parseDashboardLayoutPayload rejects invalid recentEntities config', () => {
  const base = normalizeDashboardConfig(null);
  const payload = {
    ...base,
    widgets: base.widgets.map((widget) =>
      widget.id === 'recentEntities'
        ? {
            ...widget,
            enabled: true,
            config: { category: 'invalid', limit: 10, sortBy: 'updated' },
          }
        : widget,
    ),
  };
  assert.equal(parseDashboardLayoutPayload(payload), null);
});

test('parseDashboardLayoutPayload rejects invalid worldEvents config', () => {
  const base = normalizeDashboardConfig(null);
  const payload = {
    ...base,
    widgets: base.widgets.map((widget) =>
      widget.id === 'worldEvents'
        ? {
            ...widget,
            enabled: true,
            config: { typeFilters: ['bogus'], limit: 10, sortBy: 'date' },
          }
        : widget,
    ),
  };
  assert.equal(parseDashboardLayoutPayload(payload), null);
});

test('parseDashboardLayoutPayload accepts valid world widget configs', () => {
  const base = normalizeDashboardConfig(null);
  const payload = {
    ...base,
    widgets: base.widgets.map((widget) => {
      if (widget.id === 'recentEntities') {
        return {
          ...widget,
          config: { category: 'locations', limit: 5, sortBy: 'created' },
        };
      }
      if (widget.id === 'worldEvents') {
        return {
          ...widget,
          config: {
            typeFilters: ['conflict', 'political'],
            limit: 20,
            sortBy: 'importance',
          },
        };
      }
      if (widget.id === 'factionsAtWar') {
        return { ...widget, config: { sortBy: 'alphabetical', limit: 5 } };
      }
      return widget;
    }),
  };
  const parsed = parseDashboardLayoutPayload(payload);
  assert.ok(parsed);
  const recent = parsed.widgets.find((w) => w.id === 'recentEntities');
  assert.deepEqual(recent?.config, {
    category: 'locations',
    limit: 5,
    sortBy: 'created',
  });
});
