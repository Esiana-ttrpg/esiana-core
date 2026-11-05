import { expect, test, vi } from 'vitest';
import { fetchTimeTracking } from './timeTrackingApi';
const mockApi = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock('./api', () => ({ apiFetch: mockApi }));

test('time tracking carries Party preview to the server', async () => {
  await fetchTimeTracking('campaign', { previewAsPlayer: true });
  expect(mockApi).toHaveBeenLastCalledWith('/campaigns/campaign/time-tracking?previewAsPlayer=true');
  await fetchTimeTracking('campaign');
  expect(mockApi).toHaveBeenLastCalledWith('/campaigns/campaign/time-tracking');
});
