import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapEditorToolbar } from './MapEditorToolbar';

const props = { editMode: false, ghostMode: false, onToggleEditMode: () => {}, onToggleGhostMode: () => {}, onEditorToolChange: () => {} };

test('read-only viewers get no editing controls, including after permission loss', () => {
  assert.equal(renderToStaticMarkup(<MapEditorToolbar {...props} canEdit={false} />), '');
  assert.equal(renderToStaticMarkup(<MapEditorToolbar {...props} canEdit={false} editMode editorTool="drawCircle" />), '');
});

test('eligible viewers get the entry action before entering edit mode', () => {
  const html = renderToStaticMarkup(<MapEditorToolbar {...props} canEdit />);
  assert.match(html, /Edit map/);
  assert.doesNotMatch(html, /aria-label="Circle"|Done editing/);
});

test('dock exposes every tool and marks only the current tool as selected', () => {
  const html = renderToStaticMarkup(<MapEditorToolbar {...props} editMode editorTool="drawCircle" />);
  for (const label of ['Select / Pan', 'Pin', 'Text', 'Area', 'Circle', 'Path']) assert.ok(html.includes(`aria-label="${label}"`));
  assert.match(html, /aria-label="Circle" aria-pressed="true"/);
  assert.match(html, /aria-label="Select \/ Pan" aria-pressed="false"/);
  assert.match(html, /Choose center, then radius/);
});

test('saving disables drawing cancellation, tool changes and leaving edit mode', () => {
  const html = renderToStaticMarkup(<MapEditorToolbar {...props} editMode editorTool="drawRegion" isPersistingDraw canFinishDraw />);
  assert.match(html, /aria-label="Circle"[^>]*disabled=""/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Cancel<\/button>/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Done editing<\/button>/);
});

test('incomplete drawings cannot finish; failed circle saves can be retried', () => {
  const incomplete = renderToStaticMarkup(<MapEditorToolbar {...props} editMode editorTool="drawRegion" canFinishDraw={false} />);
  assert.match(incomplete, /<button[^>]*disabled=""[^>]*>Finish<\/button>/);
  const retry = renderToStaticMarkup(<MapEditorToolbar {...props} editMode editorTool="drawCircle" canFinishDraw />);
  assert.match(retry, /<button type="button">Finish<\/button>/);
});
