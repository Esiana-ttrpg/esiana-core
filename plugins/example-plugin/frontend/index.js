/**
 * Example frontend plugin — RPC, pages, widgets, sidebar, domain events.
 */
export const name = 'Example Plugin';

function renderBanner(root, context) {
  const greeting =
    typeof context.config?.greeting === 'string' && context.config.greeting.trim()
      ? context.config.greeting.trim()
      : 'Hello from example-plugin';
  root.className =
    'esiana-plugin-surface rounded-lg border border-border bg-elevated/50 px-3 py-2 text-xs text-muted';
  root.textContent = `${greeting}${context.campaignHandle ? ` · ${context.campaignHandle}` : ''}`;
}

export function register(registry) {
  registry.registerSlot('sidebar', {
    render(root, context) {
      renderBanner(root, context);
    },
  });

  registry.registerSlot('header', {
    render(root, context) {
      root.className =
        'esiana-plugin-surface rounded-md border border-border bg-elevated/80 px-2 py-1 text-xs text-muted';
      root.textContent =
        typeof context.config?.greeting === 'string'
          ? context.config.greeting.trim()
          : 'Example';
    },
  });

  registry.registerPage({
    id: 'demo',
    title: 'Example Plugin',
    render(root, context, navigation) {
      root.className = 'space-y-3 text-sm';
      const title = document.createElement('h2');
      title.textContent = navigation.location.subpath || 'Overview';
      root.appendChild(title);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'rounded-md border border-border px-3 py-1';
      button.textContent = 'Open detail view';
      button.addEventListener('click', () => {
        navigation.push({ subpath: 'detail' });
      });
      root.appendChild(button);

      const echoButton = document.createElement('button');
      echoButton.type = 'button';
      echoButton.className = 'ml-2 rounded-md border border-border px-3 py-1';
      echoButton.textContent = 'RPC echo';
      echoButton.addEventListener('click', () => {
        void context.api.post('/echo', { at: new Date().toISOString() });
      });
      root.appendChild(echoButton);
    },
  });

  registry.registerSidebarItem({
    id: 'example-demo',
    label: 'Example',
    icon: 'lucide:Sparkles',
    section: 'tools',
    pageId: 'demo',
  });

  registry.registerDashboardWidget({
    id: 'status',
    title: 'Example Status',
    minW: 3,
    minH: 2,
    render(root, context, widgetConfig) {
      root.className = 'text-sm text-muted';
      const label =
        typeof widgetConfig.label === 'string' && widgetConfig.label.trim()
          ? widgetConfig.label.trim()
          : 'Example widget';
      root.textContent = label;
      if (context.campaignHandle) {
        const unsub = registry.subscribeToDomainEvent('core:calendar:advanced', () => {
          root.textContent = `${label} · calendar advanced`;
        });
        return () => unsub();
      }
    },
    renderSettings(root, _context, widgetConfig, saveConfig) {
      root.className = 'space-y-2 text-sm';
      const input = document.createElement('input');
      input.className = 'w-full rounded-md border border-border bg-background px-2 py-1';
      input.value = typeof widgetConfig.label === 'string' ? widgetConfig.label : '';
      input.placeholder = 'Widget label';
      input.addEventListener('change', () => {
        saveConfig({ label: input.value });
      });
      root.appendChild(input);
    },
  });
}
