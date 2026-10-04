import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  listCreatableCodexPageTypes,
  workspaceToSegment,
} from './campaignWorkspaceRoutes.js';

describe('listCreatableCodexPageTypes', () => {
  it('returns CreatePageModal codex types from createVia', () => {
    const types = listCreatableCodexPageTypes();
    assert.deepEqual(
      types.map((t) => t.categoryTitle),
      [
        'Characters',
        'Bestiary',
        'Ancestries',
        'Organizations',
        'Locations',
        'Objects',
        'Families',
        'Rules/Resources',
      ],
    );
    assert.ok(!types.some((t) => t.categoryTitle === 'Journals'));
    assert.ok(!types.some((t) => t.categoryTitle === 'Pages'));
    for (const entry of types) {
      assert.ok(entry.workspace);
      assert.equal(entry.segment, workspaceToSegment(entry.workspace));
      assert.equal(typeof entry.sidebarId, 'string');
      assert.ok(entry.sidebarId.length > 0);
    }
  });
});
