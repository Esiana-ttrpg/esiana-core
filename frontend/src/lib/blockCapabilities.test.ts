import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  executeBlockAction,
  getBlockCapabilities,
  resolveBlockActionDescriptors,
} from './blockCapabilities.ts';

describe('blockCapabilities', () => {
  it('includes expand and focus for entity-hero', () => {
    const caps = getBlockCapabilities('entity-hero');
    assert.ok(caps.actions.includes('expand'));
    assert.ok(caps.actions.includes('focus'));
  });

  it('entity-discovery has focus but not expand', () => {
    const caps = getBlockCapabilities('entity-discovery');
    assert.ok(!caps.actions.includes('expand'));
    assert.ok(caps.actions.includes('focus'));
  });

  it('resolves edit chrome actions when handlers provided', () => {
    const actions = resolveBlockActionDescriptors({
      blockId: 'b1',
      blockType: 'entity-hero',
      displayScale: 'compact',
      handlers: {
        onExpandBlock: () => {},
        onFocusBlock: () => {},
      },
    });
    assert.ok(actions.some((a) => a.id === 'expand'));
    assert.ok(actions.some((a) => a.id === 'focus'));
  });

  it('jump_to_continuity is disabled without handler', () => {
    const actions = resolveBlockActionDescriptors({
      blockId: 'b1',
      blockType: 'entity-hero',
      displayScale: 'compact',
      handlers: { onExpandBlock: () => {}, onFocusBlock: () => {} },
    });
    const issues = actions.find((a) => a.id === 'jump_to_continuity');
    assert.ok(issues);
    assert.equal(issues.disabled, true);
  });

  it('executeBlockAction toggles expand off when already expanded', () => {
    let display: { activeBlockId: string | null; scale: string } = {
      activeBlockId: 'b1',
      scale: 'expanded',
    };
    executeBlockAction('expand', {
      blockId: 'b1',
      blockType: 'entity-hero',
      displayScale: 'expanded',
      handlers: {
        onExpandBlock: (id) => {
          if (display.activeBlockId === id && display.scale === 'expanded') {
            display = { activeBlockId: null, scale: 'compact' };
          }
        },
      },
    });
    assert.equal(display.scale, 'compact');
    assert.equal(display.activeBlockId, null);
  });

  it('executeBlockAction calls focus handler', () => {
    let focused: string | null = null;
    executeBlockAction('focus', {
      blockId: 'b2',
      blockType: 'entity-discovery',
      displayScale: 'compact',
      handlers: {
        onFocusBlock: (id) => {
          focused = id;
        },
      },
    });
    assert.equal(focused, 'b2');
  });
});
