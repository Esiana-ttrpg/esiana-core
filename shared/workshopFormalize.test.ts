import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getWorkshopFormalizeTargetDef,
  WORKSHOP_FORMALIZE_TARGET_DEFS,
  WORKSHOP_UI_FORMALIZE_TARGETS,
  workshopFormalizeDefaultDraftTitle,
} from './workshopFormalize.ts';
import { WORKSHOP_FORMALIZE_TARGETS } from './workshopDocument.ts';

test('every formalize target has a catalog definition', () => {
  for (const id of WORKSHOP_FORMALIZE_TARGETS) {
    const def = getWorkshopFormalizeTargetDef(id);
    assert.equal(def.id, id);
    assert.ok(def.label.trim());
    assert.ok(def.description.trim());
    assert.ok(def.titleFieldLabel.trim());
    assert.ok(def.surfaceKey.trim());
    assert.ok(def.templateType.trim());
    if (def.showInUi) {
      assert.ok(def.uiGroup);
      assert.ok(
        def.parentRoot === 'system' || def.parentFolderTitle,
        `${id} needs parentFolderTitle when not system`,
      );
    }
    if (def.parentRoot !== 'system' && def.id !== 'lore_note') {
      assert.ok(def.entityCategory, `${id} should stamp entityCategory`);
    }
  }
});

test('UI targets exclude legacy lore_note', () => {
  assert.ok(!WORKSHOP_UI_FORMALIZE_TARGETS.includes('lore_note'));
  assert.equal(
    WORKSHOP_UI_FORMALIZE_TARGETS.length,
    WORKSHOP_FORMALIZE_TARGET_DEFS.filter((def) => def.showInUi).length,
  );
});

test('workshopFormalizeDefaultDraftTitle uses human labels', () => {
  assert.equal(workshopFormalizeDefaultDraftTitle('organization'), 'New Organization');
  assert.equal(workshopFormalizeDefaultDraftTitle('bestiary'), 'New Creature');
  assert.equal(workshopFormalizeDefaultDraftTitle('rules_resource'), 'New Resource');
});
