import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildFilterChips,
  parseGlobalSearchQuery,
  parseIsoDateOnly,
  positiveSearchTokens,
  setTypeFilterInQuery,
  stripFilterFromQuery,
} from './globalSearchQuery.js';

describe('parseGlobalSearchQuery', () => {
  it('parses plain text', () => {
    const parsed = parseGlobalSearchQuery('  Besaid  ');
    assert.equal(parsed.raw, 'Besaid');
    assert.equal(parsed.text, 'besaid');
    assert.deepEqual(parsed.terms, ['besaid']);
    assert.deepEqual(parsed.phrases, []);
    assert.deepEqual(parsed.excludedTerms, []);
    assert.deepEqual(parsed.filters, {});
  });

  it('parses quoted phrases', () => {
    const parsed = parseGlobalSearchQuery('"crystal tower"');
    assert.deepEqual(parsed.phrases, ['crystal tower']);
    assert.deepEqual(parsed.terms, []);
    assert.equal(parsed.text, 'crystal tower');
  });

  it('parses exclusions', () => {
    const parsed = parseGlobalSearchQuery('Besaid -Sin');
    assert.deepEqual(parsed.terms, ['besaid']);
    assert.deepEqual(parsed.excludedTerms, ['sin']);
  });

  it('parses type: operator', () => {
    const parsed = parseGlobalSearchQuery('Besaid type:character');
    assert.deepEqual(parsed.terms, ['besaid']);
    assert.deepEqual(parsed.filters.types, ['character']);
  });

  it('parses in: scopes', () => {
    const parsed = parseGlobalSearchQuery('in:sessions Besaid');
    assert.deepEqual(parsed.filters.types, ['session-note']);
    assert.deepEqual(parsed.filters.scopes, ['sessions']);
    assert.deepEqual(parsed.terms, ['besaid']);
  });

  it('parses from: with bare and quoted values', () => {
    const bare = parseGlobalSearchQuery('from:allison Besaid');
    assert.deepEqual(bare.filters.authors, ['allison']);
    assert.deepEqual(bare.terms, ['besaid']);

    const quoted = parseGlobalSearchQuery('from:"Allison Smith" Besaid');
    assert.deepEqual(quoted.filters.authors, ['Allison Smith']);
    assert.deepEqual(quoted.terms, ['besaid']);
  });

  it('parses before: and after: ISO dates', () => {
    const parsed = parseGlobalSearchQuery(
      'after:2026-01-01 before:2026-06-01 in:sessions',
    );
    assert.equal(parsed.filters.after, '2026-01-01');
    assert.equal(parsed.filters.before, '2026-06-01');
    assert.deepEqual(parsed.filters.types, ['session-note']);
  });

  it('handles multiple operators and free text in any order', () => {
    const a = parseGlobalSearchQuery('type:character Besaid');
    const b = parseGlobalSearchQuery('Besaid type:character');
    assert.deepEqual(a.filters.types, b.filters.types);
    assert.deepEqual(a.terms, b.terms);
  });

  it('preserves unknown operators as free text', () => {
    const parsed = parseGlobalSearchQuery('chocobo foo:bar');
    assert.deepEqual(parsed.terms, ['chocobo', 'foo:bar']);
    assert.deepEqual(parsed.filters, {});
  });

  it('degrades malformed quotes safely', () => {
    const parsed = parseGlobalSearchQuery('"crystal tower');
    assert.deepEqual(parsed.phrases, ['crystal tower']);
  });

  it('drops invalid dates with a warning', () => {
    const parsed = parseGlobalSearchQuery('before:not-a-date Besaid');
    assert.equal(parsed.filters.before, undefined);
    assert.ok(parsed.warnings.some((w) => w.kind === 'invalid-date'));
    assert.deepEqual(parsed.terms, ['besaid']);
  });

  it('rejects impossible calendar dates', () => {
    assert.equal(parseIsoDateOnly('2026-02-30'), null);
    assert.equal(parseIsoDateOnly('2026-13-01'), null);
    assert.equal(parseIsoDateOnly('2026-01-01'), '2026-01-01');
  });

  it('unions repeated type filters and keeps last valid date', () => {
    const parsed = parseGlobalSearchQuery(
      'type:character type:location before:2026-01-01 before:2026-06-01',
    );
    assert.deepEqual(parsed.filters.types, ['character', 'location']);
    assert.equal(parsed.filters.before, '2026-06-01');
  });

  it('normalizes whitespace and case', () => {
    const parsed = parseGlobalSearchQuery('  TYPE:Character   "Crystal   Tower"  ');
    assert.deepEqual(parsed.filters.types, ['character']);
    assert.deepEqual(parsed.phrases, ['crystal tower']);
  });

  it('warns on unknown type/scope without failing', () => {
    const parsed = parseGlobalSearchQuery('type:spaceship in:galaxy Besaid');
    assert.ok(parsed.warnings.some((w) => w.kind === 'unknown-type'));
    assert.ok(parsed.warnings.some((w) => w.kind === 'unknown-scope'));
    assert.deepEqual(parsed.terms, ['besaid']);
    assert.equal(parsed.filters.types, undefined);
  });

  it('maps session aliases to session-note', () => {
    assert.deepEqual(
      parseGlobalSearchQuery('type:session').filters.types,
      ['session-note'],
    );
    assert.deepEqual(
      parseGlobalSearchQuery('type:sessions').filters.types,
      ['session-note'],
    );
  });

  it('does not invent in:wiki or in:plugins', () => {
    const wiki = parseGlobalSearchQuery('in:wiki Besaid');
    assert.ok(wiki.warnings.some((w) => w.kind === 'unknown-scope'));
    assert.equal(wiki.filters.types, undefined);

    const plugins = parseGlobalSearchQuery('in:plugins Besaid');
    assert.ok(plugins.warnings.some((w) => w.kind === 'unknown-scope'));
  });

  it('builds positive tokens from terms and phrase words', () => {
    const parsed = parseGlobalSearchQuery('"crystal tower" Besaid');
    assert.deepEqual(positiveSearchTokens(parsed).sort(), [
      'besaid',
      'crystal',
      'tower',
    ]);
  });

  it('builds filter chips only for structured operators', () => {
    const chips = buildFilterChips(
      parseGlobalSearchQuery('Besaid type:character from:allison after:2026-01-01'),
    );
    assert.deepEqual(
      chips.map((c) => c.kind),
      ['type', 'from', 'after'],
    );
    assert.ok(chips.every((c) => c.label.length > 0));
  });

  it('strips a chip while preserving free text', () => {
    const raw = 'Besaid type:character from:allison';
    const next = stripFilterFromQuery(raw, {
      kind: 'type',
      value: 'character',
      label: 'Character',
    });
    assert.equal(next, 'Besaid from:allison');
  });

  it('setTypeFilterInQuery replaces type/in operators', () => {
    const withType = setTypeFilterInQuery('Besaid type:location', 'character');
    assert.equal(withType, 'Besaid type:character');

    const cleared = setTypeFilterInQuery('Besaid type:location', null);
    assert.equal(cleared, 'Besaid');

    const fromTab = setTypeFilterInQuery('Besaid', 'character');
    assert.equal(fromTab, 'Besaid type:character');
  });

  it('preserves exclusions when rewriting type filter', () => {
    const next = setTypeFilterInQuery('Besaid -Sin type:location', 'character');
    assert.equal(next, 'Besaid -Sin type:character');
  });
});
