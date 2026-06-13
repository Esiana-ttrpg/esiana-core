import { useMemo } from 'react';
import { usePluginRuntime } from '@/plugins/PluginRuntimeProvider';
import type { PluginUiSlotId } from '@/plugins/slots';

/** True when at least one loaded plugin declares this slot in its manifest. */
export function useDeclaredPluginSlot(slot: PluginUiSlotId): boolean {
  const { plugins } = usePluginRuntime();
  return useMemo(
    () => plugins.some((plugin) => plugin.uiSlots?.includes(slot)),
    [plugins, slot],
  );
}
