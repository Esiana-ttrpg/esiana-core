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

test('normalization preserves customized legacy layouts without enabling new defaults', () => {
  const normalized = normalizeDashboardConfig({ widgets: [
    { id: 'sessionClock', x: 2, y: 7, w: 4, h: 2, enabled: true, config: { note: 'Keep me' } },
  ] });
  const widget = normalized.widgets.find((item) => item.id === 'sessionSchedule');
  assert.ok(widget);
  assert.deepEqual([widget.x, widget.y, widget.w, widget.h, widget.enabled], [2, 7, 4, 2, true]);
  assert.deepEqual(widget.config, { note: 'Keep me' });
  assert.deepEqual(normalized.widgets.filter((item) => item.enabled).map((item) => item.id), ['sessionSchedule']);
});

test('getDefaultDashboardConfig enables narrative briefing widgets', () => {
  const defaults = normalizeDashboardConfig(null);
  for (const id of [
    'campaignAtAGlance',
    'currentStory',
    'partyRoster',
    'recentActivity',
    'livingThreads',
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

test('normalizeDashboardConfig adds authored and downtime widgets disabled by default', () => {
  const normalized = normalizeDashboardConfig(null);
  for (const id of ['description', 'text', 'havenDowntime'] as const) {
    const widget = normalized.widgets.find((item) => item.id === id);
    assert.ok(widget, `expected ${id} widget`);
    assert.equal(widget.enabled, false);
  }
  assert.deepEqual(
    normalized.widgets.find((item) => item.id === 'text')?.config,
    { title: '', text: '' },
  );
});

test('normalizeDashboardConfig bounds text widget content', () => {
  const base = normalizeDashboardConfig(null);
  const normalized = normalizeDashboardConfig({
    ...base,
    widgets: base.widgets.map((widget) =>
      widget.id === 'text'
        ? { ...widget, config: { title: 'T'.repeat(100), text: 'B'.repeat(2_100) } }
        : widget,
    ),
  });
  const textWidget = normalized.widgets.find((widget) => widget.id === 'text');
  assert.equal((textWidget?.config?.title as string).length, 80);
  assert.equal((textWidget?.config?.text as string).length, 2_000);
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

test('plugin placements and presentation preferences survive save and refresh', () => {
  const parsed = parseDashboardLayoutPayload({ widgets: [
    { id: 'plugin:journal:reading', x: 3, y: 5, w: 6, h: 3, enabled: true, variant: 'compact', autoHeight: true, config: { selected: 'entry' } },
  ] });
  assert.ok(parsed);
  const refreshed = normalizeDashboardConfig(JSON.parse(JSON.stringify(parsed)));
  const widget = refreshed.widgets.find((item) => item.id === 'plugin:journal:reading');
  assert.ok(widget);
  assert.equal(widget.variant, 'compact');
  assert.equal(widget.autoHeight, true);
  assert.deepEqual(widget.config, { selected: 'entry' });
  assert.equal(refreshed.widgets.filter((item) => item.enabled).length, 1);
});

test('an intentionally empty layout remains empty', () => {
  assert.equal(normalizeDashboardConfig({ widgets: [] }).widgets.filter((item) => item.enabled).length, 0);
  assert.ok(parseDashboardLayoutPayload({ widgets: [] }));
});

test('non-finite placement coordinates are rejected', () => {
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.equal(parseDashboardLayoutPayload({ widgets: [
      { id: 'partyRoster', x: value, y: 0, w: 4, h: 2, enabled: true },
    ] }), null);
  }
});

test('fine row positions survive persistence without changing legacy dimensions', () => {
  const parsed = parseDashboardLayoutPayload({ widgets: [
    { id: 'currentStory', x: 0, y: 1.75, w: 7, h: 3.25, enabled: true, autoHeight: false },
    { id: 'partyRoster', x: 7, y: 2, w: 5, h: 3, enabled: true },
  ] });
  assert.ok(parsed);
  const refreshed = normalizeDashboardConfig(JSON.parse(JSON.stringify(parsed)));
  assert.equal(refreshed.widgets.find((item) => item.id === 'currentStory')?.y, 1.75);
  assert.equal(refreshed.widgets.find((item) => item.id === 'currentStory')?.h, 3.25);
  assert.equal(refreshed.widgets.find((item) => item.id === 'partyRoster')?.h, 3);
});

test('mixed quick links round-trip through the existing layout payload in configured order', () => {
  const links = ['maps', { kind: 'external', id: 'atlas', label: 'Shared atlas', url: 'https://example.com/world', icon: 'book' }, 'sessionNotes'];
  const parsed = parseDashboardLayoutPayload({ widgets: [{ id: 'quickUtilityNav', x: 3, y: 2, w: 4, h: 2, enabled: true, config: { links } }] });
  assert.ok(parsed);
  const refreshed = normalizeDashboardConfig(JSON.parse(JSON.stringify(parsed)));
  const widget = refreshed.widgets.find(item => item.id === 'quickUtilityNav');
  assert.deepEqual(widget?.config?.links, links);
  assert.deepEqual([widget?.x, widget?.y, widget?.w, widget?.h], [3, 2, 4, 2]);
});

test('unsafe external links are rejected before normalization can repair saved data', () => {
  const parsed = parseDashboardLayoutPayload({ widgets: [{ id: 'quickUtilityNav', x: 0, y: 0, w: 4, h: 2, enabled: true,
    config: { links: [{ kind: 'external', id: 'unsafe', label: 'Unsafe', url: 'javascript:alert(1)' }] },
  }] });
  assert.equal(parsed, null);
});
