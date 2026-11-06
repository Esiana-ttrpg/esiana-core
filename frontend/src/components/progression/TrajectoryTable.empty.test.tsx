import { expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { TrajectoryTable } from './TrajectoryTable';

test('uses the supplied empty message and falls back to the default', () => {
  const props = { campaignHandle: 'test', flatPages: [], eras: [], rows: [], onPatch: vi.fn(), onPersistPage: vi.fn() };
  const custom = renderToStaticMarkup(<MemoryRouter><TrajectoryTable {...props} emptyMessage="No matching trajectories." /></MemoryRouter>);
  const standard = renderToStaticMarkup(<MemoryRouter><TrajectoryTable {...props} /></MemoryRouter>);
  expect(custom).toContain('No matching trajectories.');
  expect(standard).toContain('No trajectories yet.');
});
