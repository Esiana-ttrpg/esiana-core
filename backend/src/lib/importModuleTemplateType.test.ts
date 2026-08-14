import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveImportEntityCategory,
  resolveImportTemplateType,
} from './importModuleTemplateType.js';

test('resolveImportTemplateType maps structural modules and coerces legacy frontmatter', () => {
  assert.equal(resolveImportTemplateType('Characters', {}), 'DEFAULT');
  assert.equal(resolveImportTemplateType('Locations', {}), 'DEFAULT');
  assert.equal(resolveImportTemplateType('Game/Journals', {}), 'JOURNAL');
  assert.equal(resolveImportTemplateType('Characters', { templateType: 'ARC' }), 'ARC');
  assert.equal(resolveImportTemplateType('Characters', { templateType: 'CHARACTER' }), 'DEFAULT');
});

test('resolveImportEntityCategory stamps codex categories from module', () => {
  assert.equal(resolveImportEntityCategory('Characters', {}), 'characters');
  assert.equal(resolveImportEntityCategory('Bestiary', {}), 'bestiary');
  assert.equal(resolveImportEntityCategory('Ancestries', {}), 'ancestries');
  assert.equal(resolveImportEntityCategory('Game/Rules & Resources', {}), 'rules-resources');
  assert.equal(resolveImportEntityCategory('Game/Journals', {}), 'journals');
});
