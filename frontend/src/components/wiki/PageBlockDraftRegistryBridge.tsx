import { useEffect } from 'react';
import type { PageBlockDraftRegistryValue } from '@/contexts/PageBlockDraftRegistry';
import { usePageBlockDraftRegistry } from '@/contexts/PageBlockDraftRegistry';

/** Lifts registry API to WikiPage for exit-edit flush without prop drilling. */
export function PageBlockDraftRegistryBridge({
  onRegistry,
}: {
  onRegistry: (registry: PageBlockDraftRegistryValue | null) => void;
}) {
  const registry = usePageBlockDraftRegistry();
  useEffect(() => {
    onRegistry(registry);
  }, [onRegistry, registry]);
  return null;
}
