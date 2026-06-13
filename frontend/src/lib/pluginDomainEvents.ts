const PLUGIN_DOMAIN_EVENT = 'esiana:plugin-domain-event';

export interface PluginDomainEventDetail {
  type: string;
  campaignHandle: string;
  payload?: Record<string, unknown>;
}

export function dispatchPluginDomainEvent(detail: PluginDomainEventDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PLUGIN_DOMAIN_EVENT, { detail }));
}

export function subscribeToPluginDomainEvent(
  campaignHandle: string,
  pattern: string,
  handler: (detail: PluginDomainEventDetail) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const listener = (event: Event) => {
    const custom = event as CustomEvent<PluginDomainEventDetail>;
    const detail = custom.detail;
    if (!detail || detail.campaignHandle !== campaignHandle) return;
    if (!matchesDomainEventPattern(pattern, detail.type)) return;
    handler(detail);
  };

  window.addEventListener(PLUGIN_DOMAIN_EVENT, listener);
  return () => window.removeEventListener(PLUGIN_DOMAIN_EVENT, listener);
}

function matchesDomainEventPattern(pattern: string, type: string): boolean {
  if (pattern === '*' || pattern === type) return true;
  if (pattern.endsWith('*')) {
    return type.startsWith(pattern.slice(0, -1));
  }
  return false;
}

export function installPluginDomainEventFocusRefresh(
  campaignHandle: string,
  refresh: () => void,
): () => void {
  const onVisibility = () => {
    if (document.visibilityState === 'visible') refresh();
  };
  document.addEventListener('visibilitychange', onVisibility);
  return () => document.removeEventListener('visibilitychange', onVisibility);
}
