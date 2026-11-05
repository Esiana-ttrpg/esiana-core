import { expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdventureWorkspaceProvider, useAdventureWorkspace } from './AdventureWorkspaceContext';

const state = vi.hoisted(() => ({ elevated: false }));
vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({ hasElevatedView: state.elevated, campaignHandle: 'test' }) }));
vi.mock('@/hooks/useAdventureRoute', () => ({ useAdventureRoute: () => ({}) }));
vi.mock('@/lib/workspacePersistence', () => ({ readAdventurePerspective: () => null,
  patchAdventurePerspective: () => {}, clearLegacyAdventurePerspectives: () => {} }));

function Probe() {
  const { perspective, playerPreview, isDMUser } = useAdventureWorkspace();
  return <span>{`${perspective}:${playerPreview}:${isDMUser}`}</span>;
}

test('missing or legacy perspective resolves from current authority', () => {
  state.elevated = false;
  expect(renderToStaticMarkup(<AdventureWorkspaceProvider><Probe /></AdventureWorkspaceProvider>)).toContain('party:true:false');
  state.elevated = true;
  expect(renderToStaticMarkup(<AdventureWorkspaceProvider><Probe /></AdventureWorkspaceProvider>)).toContain('dm:false:true');
});
