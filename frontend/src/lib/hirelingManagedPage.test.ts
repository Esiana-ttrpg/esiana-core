import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CharacterPageDescriptor } from '@shared/characterPages';
import { isHirelingDowntimeManagedPage } from './hirelingManagedPage';

const page = (title: string, renderMode: CharacterPageDescriptor['renderMode'] = 'CANVAS') => ({ title, renderMode } as CharacterPageDescriptor);

describe('Hireling managed Character page', () => {
  it('uses a user-created Downtime canvas page as the projection surface', () => {
    assert.equal(isHirelingDowntimeManagedPage(page('Downtime')), true);
    assert.equal(isHirelingDowntimeManagedPage(page(' downtime ')), true);
  });

  it('does not require or manufacture a managed page', () => {
    assert.equal(isHirelingDowntimeManagedPage(null), false);
    assert.equal(isHirelingDowntimeManagedPage(page('Notes')), false);
    assert.equal(isHirelingDowntimeManagedPage(page('Downtime', 'PLUGIN')), false);
  });
});
