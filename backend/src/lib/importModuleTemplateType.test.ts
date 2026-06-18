import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveImportEntityCategory,
  resolveImportTemplateType,
} from './importModuleTemplateType.js';

test('resolveImportTemplateType maps Obsidian modules and respects frontmatter', () => {
  assert.equal(resolveImportTemplateType('Characters', {}), 'CHARACTER');
  assert.equal(resolveImportTemplateType('Game/Journals', {}), 'JOURNAL');
  assert.equal(resolveImportTemplateType('Characters', { templateType: 'ARC' }), 'ARC');
});

test('resolveImportEntityCategory stamps codex categories from module', () => {
  assert.equal(resolveImportEntityCategory('Bestiary', {}), 'bestiary');
  assert.equal(resolveImportEntityCategory('Ancestries', {}), 'ancestries');
  assert.equal(resolveImportEntityCategory('Game/Rules & Resources', {}), 'rules-resources');
  assert.equal(resolveImportEntityCategory('Game/Journals', {}), 'journals');
});
