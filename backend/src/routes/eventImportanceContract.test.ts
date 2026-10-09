import assert from 'node:assert/strict';
import test from 'node:test';
import { loadOpenApiSpec, resolveOpenApiSpecPath } from './openapiDocs.js';

test('OpenAPI documents chronology importance and campaign defaults', () => {
  const spec = loadOpenApiSpec(resolveOpenApiSpecPath()) as {
    paths: Record<string, unknown>;
    components: { schemas: Record<string, { enum?: string[]; properties?: Record<string, unknown> }> };
  };
  const importance = spec.components.schemas.CalendarEventImportance;
  assert.deepEqual(importance.enum, ['NOTICE', 'MINOR', 'MAJOR']);
  assert.ok(spec.components.schemas.ChronologySettings);
  assert.ok(spec.components.schemas.ChronologySettingsUpdate);
  assert.ok(spec.components.schemas.CalendarEventCategory);
  assert.ok(spec.paths['/api/campaigns/{campaignHandle}/chronology/settings']);
  assert.ok(spec.paths['/api/campaigns/{campaignHandle}/chronology/categories']);
});

test('event classification defaults and override rules are explicit', () => {
  const defaults = {
    manual: 'MINOR',
    downtime: 'NOTICE',
    progression: 'NOTICE',
  } as const;
  assert.equal(defaults.progression, 'NOTICE');
  const acceptedEvent = { importance: defaults.progression, categoryId: null };
  const editedEvent = { ...acceptedEvent, importance: 'MAJOR', categoryId: 'battle' };
  const repeatedAcceptance = editedEvent;
  assert.equal(repeatedAcceptance.importance, 'MAJOR');
  assert.equal(repeatedAcceptance.categoryId, 'battle');
});
