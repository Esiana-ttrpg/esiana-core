import { externalLinks } from '@shared/externalLinks';

const DOCS_URL = externalLinks.documentation;

/** Published documentation routes. */
export const docsLinks = {
  home: DOCS_URL,
  sessionRecordingsPrivacy: `${DOCS_URL}features/session-recordings-privacy/`,
  importFormats: `${DOCS_URL}data-management/import-formats/`,
  narrativeThreads: `${DOCS_URL}features/narrative-threads/`,
  campaignHistorySnapshots: `${DOCS_URL}features/campaign-history-and-snapshots/`,
  discoveryRevelation: `${DOCS_URL}features/discovery-and-revelation/`,
  mapsCartography: `${DOCS_URL}features/maps-and-cartography/`,
  pluginsOverview: `${DOCS_URL}features/plugins-overview/`,
  worldAdvance: `${DOCS_URL}features/world-advance/`,
  selfHosting: `${DOCS_URL}self-hosting/installation/`,
  pluginDevelopment: `${DOCS_URL}plugin-development/getting-started/`,
} as const;

export type DocsLinkKey = keyof typeof docsLinks;

export function docsUrl(key: DocsLinkKey): string {
  return docsLinks[key];
}
