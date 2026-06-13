import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDashboardConfig } from './dashboardConfig.js';
import {
  clampUnit,
  createDefaultHeroConfig,
  normalizeHeroConfig,
  parseHeroMode,
} from './dashboardHeroPresentation.js';

test('createDefaultHeroConfig uses standard mode and centered focal point', () => {
  const hero = createDefaultHeroConfig();
  assert.equal(hero.heroMode, 'standard');
  assert.equal(hero.focalPointX, 0.5);
  assert.equal(hero.focalPointY, 0.5);
  assert.equal(hero.overlayStrength, 0.55);
});

test('normalizeHeroConfig clamps focal point and overlay', () => {
  const hero = normalizeHeroConfig({
    coverImageUrl: 'https://example.com/banner.jpg',
    summary: 'Tagline',
    heroMode: 'cinematic',
    focalPointX: 2,
    focalPointY: -1,
    overlayStrength: 5,
  });
  assert.equal(hero.heroMode, 'cinematic');
  assert.equal(hero.coverImageUrl, null);
  assert.equal(hero.focalPointX, 1);
  assert.equal(hero.focalPointY, 0);
  assert.equal(hero.overlayStrength, 1);
});

test('normalizeHeroConfig defaults invalid heroMode to standard', () => {
  const hero = normalizeHeroConfig({ heroMode: 'huge' });
  assert.equal(hero.heroMode, 'standard');
});

test('normalizeHeroConfig coerces legacy external cover to null', () => {
  const hero = normalizeHeroConfig({
    coverImageUrl: 'https://example.com/x.png',
    summary: 'Old campaign',
  });
  assert.equal(hero.coverImageUrl, null);
  assert.equal(hero.summary, 'Old campaign');
  assert.equal(hero.heroMode, 'standard');
  assert.equal(hero.focalPointX, 0.5);
  assert.equal(hero.overlayStrength, 0.55);
});

test('normalizeHeroConfig preserves canonical asset reference', () => {
  const hero = normalizeHeroConfig({
    coverImageUrl: '/api/assets/asset-1',
    summary: 'Canonical',
  });
  assert.equal(hero.coverImageUrl, '/api/assets/asset-1');
});

test('parseHeroMode accepts known modes', () => {
  assert.equal(parseHeroMode('compact'), 'compact');
  assert.equal(parseHeroMode('cinematic'), 'cinematic');
});

test('clampUnit handles non-finite values', () => {
  assert.equal(clampUnit('bad', 0.5), 0.5);
  assert.equal(clampUnit(0.25, 0.5), 0.25);
});

test('normalizeDashboardConfig applies hero normalization', () => {
  const config = normalizeDashboardConfig({
    hero: { summary: 'Hi' },
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
  assert.equal(config.hero.heroMode, 'standard');
  assert.equal(config.hero.focalPointY, 0.5);
});
