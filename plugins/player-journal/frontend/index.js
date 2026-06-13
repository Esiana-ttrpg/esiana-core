export const name = 'player-journal';

const PLUGIN_ID = 'player-journal';

function apiBase(context) {
  return context.apiBase ?? '';
}

async function loadEntries(context) {
  if (!context.campaignId) return [];
  const res = await fetch(
    `${apiBase(context)}/api/plugin-runtime/${PLUGIN_ID}/entries?campaignId=${encodeURIComponent(context.campaignId)}`,
    { credentials: 'include' },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.entries) ? data.entries : [];
}

async function saveEntries(context, entries) {
  const res = await fetch(`${apiBase(context)}/api/plugin-runtime/${PLUGIN_ID}/entries`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId: context.campaignId, entries }),
  });
  return res.ok;
}

async function publishExcerpt(context, entry) {
  const slug = context.campaignSlug;
  if (!slug || !entry.body?.trim()) return null;
  const folder =
    typeof context.config?.publishFolderTitle === 'string'
      ? context.config.publishFolderTitle.trim()
      : 'Journals';
  const title = entry.title?.trim() || 'Journal excerpt';
  const res = await fetch(`/api/campaigns/${slug}/wiki`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `${title} (${folder})`,
      blocks: [
        {
          id: `journal-${entry.id}`,
          type: 'text-tiptap',
          x: 0,
          y: 0,
          w: 12,
          h: 8,
          isPrivate: false,
          visibility: 'Party',
          content: { markdown: entry.body.trim() },
        },
      ],
      templateType: 'DEFAULT',
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const pageId = data?.page?.id;
  if (!pageId) return null;
  await fetch(`${apiBase(context)}/api/plugin-runtime/${PLUGIN_ID}/entries/${entry.id}/published`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId: context.campaignId, wikiPageId: pageId }),
  });
  return pageId;
}

function renderJournal(root, context) {
  root.innerHTML = '';
  root.className =
    'esiana-plugin-surface rounded-lg border border-border bg-elevated/40 p-3 text-sm space-y-2';

  const heading = document.createElement('h3');
  heading.className = 'font-medium text-primary';
  heading.textContent = 'Player Journal';
  root.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'space-y-2 max-h-48 overflow-y-auto';
  root.appendChild(list);

  const form = document.createElement('div');
  form.className = 'space-y-1 border-t border-border pt-2';
  const titleInput = document.createElement('input');
  titleInput.className = 'w-full rounded border border-border bg-surface px-2 py-1 text-xs';
  titleInput.placeholder = 'Title';
  const bodyInput = document.createElement('textarea');
  bodyInput.className = 'w-full rounded border border-border bg-surface px-2 py-1 text-xs min-h-[60px]';
  bodyInput.placeholder = 'Private notes… [[wikilinks]] and @mentions work when published.';
  const actions = document.createElement('div');
  actions.className = 'flex gap-2';
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'rounded bg-primary px-2 py-1 text-xs text-primary-fg';
  addBtn.textContent = 'Save entry';
  actions.appendChild(addBtn);
  form.appendChild(titleInput);
  form.appendChild(bodyInput);
  form.appendChild(actions);
  root.appendChild(form);

  let entries = [];

  async function refresh() {
    entries = await loadEntries(context);
    list.innerHTML = '';
    if (!entries.length) {
      list.textContent = 'No journal entries yet.';
      return;
    }
    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'rounded border border-border/60 p-2 text-xs';
      row.innerHTML = `<strong>${entry.title ?? 'Untitled'}</strong><p class="text-muted mt-1">${(entry.body ?? '').slice(0, 120)}</p>`;
      if (entry.publishedWikiPageId) {
        const tag = document.createElement('span');
        tag.className = 'text-[10px] text-muted';
        tag.textContent = ' · published';
        row.appendChild(tag);
      } else {
        const pub = document.createElement('button');
        pub.type = 'button';
        pub.className = 'mt-1 text-[10px] underline text-primary';
        pub.textContent = 'Publish excerpt to wiki';
        pub.onclick = async () => {
          pub.disabled = true;
          await publishExcerpt(context, entry);
          await refresh();
        };
        row.appendChild(pub);
      }
      list.appendChild(row);
    }
  }

  addBtn.onclick = async () => {
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    if (!body) return;
    entries = [
      {
        id: crypto.randomUUID(),
        title: title || 'Untitled',
        body,
        createdAt: new Date().toISOString(),
      },
      ...entries,
    ];
    await saveEntries(context, entries);
    titleInput.value = '';
    bodyInput.value = '';
    await refresh();
  };

  refresh();
}

export function register(registry) {
  registry.registerSlot('dashboard', {
    render(root, context) {
      renderJournal(root, context);
    },
  });

  registry.registerSlot('campaign-plugin-settings', {
    render(root, context) {
      root.className = 'text-xs text-muted';
      root.textContent =
        'Player Journal stores private entries in PluginData. Publishing creates a party-visible wiki page under the configured folder.';
    },
  });
}
