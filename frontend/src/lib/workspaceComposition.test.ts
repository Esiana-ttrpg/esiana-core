import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isWorkspaceComposition,
  resolveWorkspaceComposition,
} from './workspaceComposition.ts';

describe('workspaceComposition', () => {
  it('resolves dashboard and codex routes to workspace presets', () => {
    assert.equal(resolveWorkspaceComposition('/campaigns/my-campaign/dashboard').id, 'dashboard');
    assert.equal(resolveWorkspaceComposition('/campaigns/my-campaign/pages/abc').id, 'codex');
    assert.equal(resolveWorkspaceComposition('/campaigns/my-campaign/characters/abc').id, 'entity');
    assert.equal(resolveWorkspaceComposition('/campaigns/my-campaign/some-page').id, 'codex');
  });

  it('resolves studio and reference routes', () => {
    assert.equal(resolveWorkspaceComposition('/campaigns/my-campaign/chronology').id, 'studio');
    assert.equal(resolveWorkspaceComposition('/campaigns/my-campaign/party').id, 'studio');
    assert.equal(resolveWorkspaceComposition('/campaigns/my-campaign/notes').id, 'reference');
  });

  it('resolves document routes', () => {
    assert.equal(resolveWorkspaceComposition('/campaigns/my-campaign/settings').id, 'document');
    assert.equal(resolveWorkspaceComposition('/campaigns/my-campaign/world-advance').id, 'document');
    assert.equal(resolveWorkspaceComposition('/campaigns/my-campaign/wiki/maintenance').id, 'document');
  });

  it('marks workspace presets as non-document', () => {
    assert.equal(isWorkspaceComposition(resolveWorkspaceComposition('/campaigns/x/pages/a')), true);
    assert.equal(isWorkspaceComposition(resolveWorkspaceComposition('/campaigns/x/settings')), false);
  });
});
