const DOCS_REPO = 'https://github.com/Esiana-ttrpg/docs/blob/main';

/** Canonical documentation wiki URLs (docs repo on `main`). */
export const docsLinks = {
  home: `${DOCS_REPO}/README.md`,
  importFormats: `${DOCS_REPO}/import_formats.md`,
  narrativeThreads: `${DOCS_REPO}/features/narrative-threads.md`,
  campaignHistorySnapshots: `${DOCS_REPO}/features/campaign-history-and-snapshots.md`,
  discoveryRevelation: `${DOCS_REPO}/features/discovery-and-revelation.md`,
  mapsCartography: `${DOCS_REPO}/features/maps-and-cartography.md`,
  pluginsOverview: `${DOCS_REPO}/features/plugins-overview.md`,
  worldAdvance: `${DOCS_REPO}/features/world-advance.md`,
  selfHosting: `${DOCS_REPO}/self-hosting/installation.md`,
  pluginDevelopment: `${DOCS_REPO}/plugin-development/getting-started.md`,
} as const;

export type DocsLinkKey = keyof typeof docsLinks;

export function docsUrl(key: DocsLinkKey): string {
  return docsLinks[key];
}
