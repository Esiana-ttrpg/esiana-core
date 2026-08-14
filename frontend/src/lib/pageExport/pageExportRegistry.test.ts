import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PAGE_EXPORT_ASCII_ID,
  PAGE_EXPORT_MARKDOWN_ID,
  PAGE_EXPORT_PRINT_ID,
  getPageExportHandlers,
} from './index.js';

describe('pageExport registry', () => {
  it('registers markdown, ascii, and print handlers with metadata', () => {
    const handlers = getPageExportHandlers();
    const markdown = handlers.find((entry) => entry.id === PAGE_EXPORT_MARKDOWN_ID);
    const ascii = handlers.find((entry) => entry.id === PAGE_EXPORT_ASCII_ID);
    const print = handlers.find((entry) => entry.id === PAGE_EXPORT_PRINT_ID);

    assert.ok(markdown);
    assert.equal(markdown.label, 'Export as Markdown (.md)');
    assert.equal(markdown.extension, 'md');
    assert.equal(markdown.mimeType, 'text/markdown;charset=utf-8');
    assert.equal(typeof markdown.order, 'number');

    assert.ok(ascii);
    assert.equal(ascii.label, 'ASCII (.txt)');
    assert.equal(ascii.extension, 'txt');
    assert.equal(ascii.mimeType, 'text/plain;charset=utf-8');
    assert.ok(ascii.order > markdown.order);
    assert.ok(ascii.order < print.order);

    assert.ok(print);
    assert.equal(print.label, 'Print…');
    assert.equal(print.extension, undefined);
    assert.equal(print.mimeType, undefined);
    assert.ok(print.order > ascii.order);
  });
});
