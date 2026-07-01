import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeFrontmatter } from './importFrontmatterNormalize.js';
import { buildPathScanRecord, resolvePlacement } from './importPlacementResolver.js';

test('explicit frontmatter type beats folder path', () => {
  const scan = buildPathScanRecord('Characters/Citadel.md');
  const placement = resolvePlacement({
    scan,
    normalized: normalizeFrontmatter({ type: 'location' }),
  });
  assert.equal(placement.outcome, 'import');
  if (placement.outcome === 'import') {
    assert.equal(placement.templateType, 'DEFAULT');
    assert.equal(placement.entityCategory, 'locations');
  }
});

test('tag location overrides character folder with warning', () => {
  const scan = buildPathScanRecord('Characters/Citadel.md');
  const placement = resolvePlacement({
    scan,
    normalized: normalizeFrontmatter({ tags: ['location'] }),
  });
  assert.equal(placement.outcome, 'import');
  if (placement.outcome === 'import') {
    assert.ok(placement.warnings?.some((warning) => warning.includes('location')));
  }
});

test('tags classify loose root Dahak note', () => {
  const scan = buildPathScanRecord('Dahak.md');
  const placement = resolvePlacement({
    scan,
    normalized: normalizeFrontmatter({ tags: ['dragon', 'deity'] }),
    wrapperPrefix: undefined,
  });
  assert.equal(placement.outcome, 'import');
});

test('bare loose root Dahak is skipped', () => {
  const scan = buildPathScanRecord('Dahak.md');
  const placement = resolvePlacement({
    scan,
    normalized: normalizeFrontmatter({}),
    wrapperPrefix: undefined,
  });
  assert.equal(placement.outcome, 'skip');
});

test('wizard mapping handles custom Midnight Foxes folder', () => {
  const scan = buildPathScanRecord(
    'Rays Pathfinder/Midnight Foxes/Kintargo Chapter.md',
    'Rays Pathfinder',
  );
  const placement = resolvePlacement({
    scan,
    normalized: normalizeFrontmatter({}),
    wrapperPrefix: 'Rays Pathfinder',
    folderMappings: [{ sourceFolderName: 'Midnight Foxes', targetModule: 'Organizations' }],
  });
  assert.equal(placement.outcome, 'import');
  if (placement.outcome === 'import') {
    assert.equal(placement.module, 'Organizations');
  }
});
