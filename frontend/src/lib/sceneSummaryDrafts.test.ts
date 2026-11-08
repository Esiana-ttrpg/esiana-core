import { expect, test, vi } from 'vitest';
import { flushSceneSummaryDrafts, pendingSceneSummaryDraft, queueSceneSummaryDraft, trackSceneMetadataSave } from './sceneSummaryDrafts';

test('switch flush saves the latest scene summary before changing perspective', async () => {
  const save = vi.fn(async () => {});
  queueSceneSummaryDraft('draft-test:scene', () => save('old'));
  queueSceneSummaryDraft('draft-test:scene', () => save('latest'));
  await flushSceneSummaryDrafts();
  expect(save).toHaveBeenCalledOnce();
  expect(save).toHaveBeenCalledWith('latest');
});

test('a failed summary save remains available for retry', async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(undefined);
  queueSceneSummaryDraft('retry-test:scene', save, 'Retained draft');
  await expect(flushSceneSummaryDrafts()).rejects.toThrow('network');
  expect(pendingSceneSummaryDraft('retry-test:scene')).toBe('Retained draft');
  await flushSceneSummaryDrafts();
  expect(save).toHaveBeenCalledTimes(2);
});

test('an edit after a failed unmount save replaces the retained draft', async () => {
  queueSceneSummaryDraft('remount-test:scene', async () => { throw new Error('offline'); }, 'First draft');
  await expect(flushSceneSummaryDrafts()).rejects.toThrow('offline');
  expect(pendingSceneSummaryDraft('remount-test:scene')).toBe('First draft');
  queueSceneSummaryDraft('remount-test:scene', async () => {}, 'Revised draft');
  expect(pendingSceneSummaryDraft('remount-test:scene')).toBe('Revised draft');
  await flushSceneSummaryDrafts();
  expect(pendingSceneSummaryDraft('remount-test:scene')).toBeUndefined();
});

test('flush waits for a replacement queued during an in-flight save', async () => {
  let releaseFirst!: () => void;
  let releaseSecond!: () => void;
  const first = new Promise<void>(resolve => { releaseFirst = resolve; });
  const second = new Promise<void>(resolve => { releaseSecond = resolve; });
  const saved: string[] = [];
  queueSceneSummaryDraft('replacement-test:scene', async () => { await first; saved.push('first'); }, 'First');
  const flushing = flushSceneSummaryDrafts();
  queueSceneSummaryDraft('replacement-test:scene', async () => { await second; saved.push('second'); }, 'Second');
  let complete = false;
  void flushing.then(() => { complete = true; });
  releaseFirst();
  await first;
  await Promise.resolve();
  expect(complete).toBe(false);
  releaseSecond();
  await flushing;
  expect(saved).toEqual(['first', 'second']);
  expect(pendingSceneSummaryDraft('replacement-test:scene')).toBeUndefined();
});

test('perspective flush waits for a scene metadata request', async () => {
  let finish!: () => void;
  const save = trackSceneMetadataSave(new Promise<void>(resolve => { finish = resolve; }));
  let switched = false;
  const flushing = flushSceneSummaryDrafts().then(() => { switched = true; });
  await Promise.resolve();
  expect(switched).toBe(false);
  finish();
  await save;
  await flushing;
  expect(switched).toBe(true);
});
