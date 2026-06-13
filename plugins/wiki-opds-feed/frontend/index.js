/**
 * Campaign plugin settings UI for Wiki OPDS Feed.
 */
export const name = 'wiki-opds-feed';

function buildCatalogUrl(campaignSlug, pluginId, apiBase) {
  const base = (apiBase || window.location.origin).replace(/\/+$/, '');
  return `${base}/api/public/plugin-runtime/${encodeURIComponent(pluginId)}/campaigns/${encodeURIComponent(campaignSlug)}/opds/catalog.atom`;
}

function renderCatalogUrlPanel(root, context) {
  root.replaceChildren();

  if (!context.isEnabled || !context.campaignSlug) {
    return;
  }

  const catalogUrl = buildCatalogUrl(context.campaignSlug, context.pluginId, context.apiBase);

  const wrapper = document.createElement('div');
  wrapper.className =
    'esiana-plugin-surface space-y-2 rounded-lg border border-border bg-background/40 p-4';

  const label = document.createElement('p');
  label.className = 'text-xs font-semibold uppercase tracking-wider text-foreground';
  label.textContent = 'OPDS catalog URL';

  const hint = document.createElement('p');
  hint.className = 'text-xs text-muted';
  hint.textContent =
    'Add this URL as an OPDS catalog source in KOReader, Calibre, or another OPDS 1.2 client. Requires this campaign to be public viewable with Public wiki pages.';

  const row = document.createElement('div');
  row.className = 'flex flex-col gap-2 sm:flex-row sm:items-center';

  const input = document.createElement('input');
  input.type = 'text';
  input.readOnly = true;
  input.value = catalogUrl;
  input.className =
    'w-full min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground';

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className =
    'shrink-0 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-elevated';
  copyButton.textContent = 'Copy';

  copyButton.addEventListener('click', () => {
    void navigator.clipboard.writeText(catalogUrl).then(
      () => {
        copyButton.textContent = 'Copied';
        window.setTimeout(() => {
          copyButton.textContent = 'Copy';
        }, 2000);
      },
      () => {
        copyButton.textContent = 'Copy failed';
      },
    );
  });

  row.append(input, copyButton);
  wrapper.append(label, hint, row);
  root.append(wrapper);
}

export function register(registry) {
  registry.registerSlot('campaign-plugin-settings', {
    render(root, context) {
      renderCatalogUrlPanel(root, context);
      return () => {
        root.replaceChildren();
      };
    },
  });
}
