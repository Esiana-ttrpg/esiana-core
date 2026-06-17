import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  createBackgroundTask,
  dismissTaskFailure,
  listActiveTasks,
  listTaskFailures,
  listTaskHistoryPage,
  resetTaskRegistryForTests,
  updateBackgroundTask,
} from './taskRegistry.js';

describe('taskRegistry', () => {
  beforeEach(() => {
    resetTaskRegistryForTests();
  });

  it('derives durationMs when a task completes', () => {
    const task = createBackgroundTask({
      taskName: 'Test task',
      type: 'AD_HOC',
      status: 'PROCESSING',
    });

    const updated = updateBackgroundTask(task.id, { status: 'COMPLETED' });
    assert.ok(updated);
    assert.ok(updated!.durationMs !== null);
    assert.ok(updated!.durationMs! >= 0);
  });

  it('lists only active tasks', () => {
    const active = createBackgroundTask({
      taskName: 'Running',
      type: 'AD_HOC',
      status: 'PROCESSING',
    });
    const done = createBackgroundTask({
      taskName: 'Done',
      type: 'AD_HOC',
      status: 'COMPLETED',
    });

    const activeTasks = listActiveTasks();
    assert.equal(activeTasks.length, 1);
    assert.equal(activeTasks[0]!.id, active.id);
    assert.notEqual(activeTasks[0]!.id, done.id);
  });

  it('filters dismissed failures from the failures list', () => {
    const failed = createBackgroundTask({
      taskName: 'Broken',
      type: 'AD_HOC',
      status: 'FAILED',
    });
    updateBackgroundTask(failed.id, { errorMessage: 'boom' });

    assert.equal(listTaskFailures().length, 1);
    assert.equal(dismissTaskFailure(failed.id), true);
    assert.equal(listTaskFailures().length, 0);

    const history = listTaskHistoryPage({ page: 1, limit: 25 });
    assert.equal(history.runs.some((run) => run.id === failed.id), true);
  });

  it('paginates finished task history', () => {
    for (let index = 0; index < 30; index += 1) {
      createBackgroundTask({
        taskName: `Task ${index}`,
        type: 'AD_HOC',
        status: 'COMPLETED',
      });
    }

    const page1 = listTaskHistoryPage({ page: 1, limit: 25 });
    assert.equal(page1.runs.length, 25);
    assert.equal(page1.pagination.totalCount, 30);
    assert.equal(page1.pagination.totalPages, 2);

    const page2 = listTaskHistoryPage({ page: 2, limit: 25 });
    assert.equal(page2.runs.length, 5);
  });
});
