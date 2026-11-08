import { expect, test, vi } from 'vitest';
import { flushSceneSummaryDrafts, queueSceneSummaryDraft } from './sceneSummaryDrafts';

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
  queueSceneSummaryDraft('retry-test:scene', save);
  await expect(flushSceneSummaryDrafts()).rejects.toThrow('network');
  await flushSceneSummaryDrafts();
  expect(save).toHaveBeenCalledTimes(2);
});
