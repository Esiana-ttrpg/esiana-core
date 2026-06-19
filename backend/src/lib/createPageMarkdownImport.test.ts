import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCreatePageImportPrefill } from './createPageMarkdownImport.js';

describe('buildCreatePageImportPrefill', () => {
  it('parses messy real-world frontmatter with heading title fallback', () => {
    const markdown = `---
tags: [warrior, cursed]
visibility: dm
---
# Captain Veyra

Some text...`;

    const { prefill, warnings } = buildCreatePageImportPrefill(
      markdown,
      'Characters',
      { filename: 'captain-veyra-draft.md' },
    );

    assert.equal(prefill.title, 'Captain Veyra');
    assert.deepEqual(
      prefill.tags.map((tag) => tag.name),
      ['warrior', 'cursed'],
    );
    assert.equal(prefill.visibility, 'DM_Only');
    assert.equal(prefill.description, '# Captain Veyra\n\nSome text...');
    assert.equal(prefill.formPatch.name, 'Captain Veyra');
    assert.equal(prefill.formPatch.visibility, 'DM_Only');
    assert.equal(warnings.length, 0);
  });

  it('falls back when there is no frontmatter at all', () => {
    const withHeading = `# Captain Veyra

Some text...`;

    const headingResult = buildCreatePageImportPrefill(withHeading, 'Characters', {
      filename: 'captain-veyra-draft.md',
    });
    assert.equal(headingResult.prefill.title, 'Captain Veyra');
    assert.equal(headingResult.prefill.description, withHeading.trim());
    assert.deepEqual(headingResult.prefill.tags, []);
    assert.equal(headingResult.prefill.visibility, undefined);

    const filenameOnly = 'Some text without a heading.';
    const filenameResult = buildCreatePageImportPrefill(filenameOnly, 'Characters', {
      filename: 'captain-veyra-draft.md',
    });
    assert.equal(filenameResult.prefill.title, 'Captain Veyra Draft');
    assert.equal(filenameResult.prefill.description, filenameOnly);
    assert.deepEqual(filenameResult.prefill.tags, []);
  });

  it('maps organization pack-style frontmatter to form fields', () => {
    const markdown = `---
title: "Shirogane Academy"
slug: "org-shirogane-academy"
entityCategory: "organizations"
orgType: "school"
headquartersId: "slug:org-shirogane-academy"
---

# Shirogane Academy

A major faction in the lunar city.`;

    const { prefill, warnings } = buildCreatePageImportPrefill(markdown, 'Organizations');

    assert.equal(prefill.title, 'Shirogane Academy');
    assert.equal(prefill.formPatch.fieldValues?.orgType, 'school');
    assert.ok(prefill.description.includes('major faction'));
    assert.ok(warnings.some((warning) => warning.includes('Unresolved reference')));
  });

  it('maps location pack-style frontmatter to form fields', () => {
    const markdown = `---
title: "Shirogane Campus"
entityCategory: "locations"
locationType: "district"
region: "Lunar City"
---

# Shirogane Campus

Part of the city.`;

    const { prefill } = buildCreatePageImportPrefill(markdown, 'Locations');

    assert.equal(prefill.title, 'Shirogane Campus');
    assert.equal(prefill.formPatch.fieldValues?.Type, 'district');
    assert.equal(prefill.formPatch.fieldValues?.Region, 'Lunar City');
  });

  it('imports character title and body wikilinks from pack-style markdown', () => {
    const markdown = `---
title: The Archivist
entityCategory: characters
---
A dust-shrouded scholar who catalogued expedition gear. Mentions [[False Antechamber]].`;

    const { prefill } = buildCreatePageImportPrefill(markdown, 'Characters');

    assert.equal(prefill.title, 'The Archivist');
    assert.ok(prefill.description.includes('[[False Antechamber]]'));
  });

  it('warns when frontmatter entity category mismatches create hub', () => {
    const markdown = `---
title: Wrong Hub
entityCategory: organizations
---
Body`;

    const { warnings } = buildCreatePageImportPrefill(markdown, 'Characters');
    assert.ok(
      warnings.some((warning) => warning.includes('does not match create hub')),
    );
  });

  it('rejects oversized markdown', () => {
    const huge = 'x'.repeat(512 * 1024 + 1);
    assert.throws(
      () => buildCreatePageImportPrefill(huge, 'Characters'),
      /too large/i,
    );
  });

  it('extracts h1 titles without polynomial regex backtracking', () => {
    const spaces = ' '.repeat(5000);
    const markdown = `#${spaces}Captain Veyra\n\nBody`;
    const { prefill } = buildCreatePageImportPrefill(markdown, 'Characters');
    assert.equal(prefill.title, 'Captain Veyra');
  });
});
