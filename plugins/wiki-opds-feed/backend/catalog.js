/**
 * OPDS catalog assembly for wiki-opds-feed (campaign-scoped plugin).
 */

function toIso(date) {
  return date.toISOString();
}

function catalogUrl(base, pluginId, campaignSlug) {
  return `${base}/api/public/plugin-runtime/${encodeURIComponent(pluginId)}/campaigns/${encodeURIComponent(campaignSlug)}/opds/catalog.atom`;
}

function acquisitionUrl(base, pluginId, campaignSlug, pageId) {
  return `${base}/api/public/plugin-runtime/${encodeURIComponent(pluginId)}/campaigns/${encodeURIComponent(campaignSlug)}/opds/pages/${encodeURIComponent(pageId)}.md`;
}

function buildSnippet(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return '';
  for (const block of blocks) {
    if (block && typeof block === 'object' && block.type === 'paragraph') {
      const content = block.content;
      if (typeof content === 'string' && content.trim()) {
        return content.trim().slice(0, 280);
      }
    }
  }
  return '';
}

/**
 * @param {object} input
 * @param {string} input.pluginId
 * @param {string} input.campaignSlug
 * @param {string} input.campaignName
 * @param {Date} input.campaignUpdatedAt
 * @param {string} input.baseUrl
 * @param {string} [input.catalogTitleSuffix]
 * @param {Array<{ id: string; title: string; blocks: unknown; updatedAt: Date }>} input.pages
 */
export function buildWikiOpdsCatalogFeed(input) {
  const suffix =
    typeof input.catalogTitleSuffix === 'string' && input.catalogTitleSuffix.trim()
      ? input.catalogTitleSuffix.trim()
      : 'Public Lore';
  const catalogHref = catalogUrl(input.baseUrl, input.pluginId, input.campaignSlug);
  const latestPageUpdate = input.pages.reduce((latest, page) => {
    if (!latest || page.updatedAt > latest) return page.updatedAt;
    return latest;
  }, null);
  const updated = latestPageUpdate ?? input.campaignUpdatedAt;

  const entries = input.pages.map((page) => {
    const snippet = buildSnippet(page.blocks);
    return {
      id: `urn:esiana:campaign:${input.campaignSlug}:wiki:${page.id}`,
      title: page.title,
      updated: toIso(page.updatedAt),
      summary: snippet || undefined,
      links: [
        {
          rel: 'http://opds-spec.org/acquisition',
          href: acquisitionUrl(input.baseUrl, input.pluginId, input.campaignSlug, page.id),
          type: 'text/markdown',
          title: page.title,
        },
      ],
    };
  });

  return {
    id: `urn:esiana:campaign:${input.campaignSlug}:opds:catalog`,
    title: `${input.campaignName} — ${suffix}`,
    updated: toIso(updated),
    author: 'Esiana',
    links: [
      { rel: 'self', href: catalogHref, type: 'application/atom+xml;profile=opds-catalog' },
      {
        rel: 'start',
        href: catalogHref,
        type: 'application/atom+xml;profile=opds-catalog',
      },
    ],
    entries,
  };
}

export function publicCatalogUrl(baseUrl, pluginId, campaignSlug) {
  return catalogUrl(baseUrl, pluginId, campaignSlug);
}
