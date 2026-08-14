import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFormalizeShell } from './workshopFormalizeShells.js';

test('buildFormalizeShell stamps entityCategory for organization', () => {
  const shell = buildFormalizeShell({
    target: 'organization',
    bodyMarkdown: 'A powerful guild.',
  });
  assert.equal(shell.metadata.entityCategory, 'organizations');
  assert.equal(shell.templateType, 'DEFAULT');
  const prose = shell.blocks.find((b) => b.type === 'text-tiptap');
  assert.ok(prose);
  assert.equal((prose!.content as { markdown: string }).markdown, 'A powerful guild.');
});

test('buildFormalizeShell uses JOURNAL template for journal target', () => {
  const shell = buildFormalizeShell({
    target: 'journal',
    bodyMarkdown: 'Dear diary…',
  });
  assert.equal(shell.templateType, 'JOURNAL');
  assert.equal(shell.metadata.entityCategory, 'journals');
});

test('buildFormalizeShell stamps object category', () => {
  const shell = buildFormalizeShell({
    target: 'object',
    bodyMarkdown: 'An ancient sword.',
  });
  assert.equal(shell.metadata.entityCategory, 'objects');
});
