/**
 * Future plugin contribution contract for Core search indexing.
 * No plugin host API is exposed in Pass 5 — this type documents the shape
 * plugins will eventually push into SearchIndexDocument.
 */
export interface SearchIndexContribution {
  /** e.g. `plugin:<pluginId>:<collection>` */
  sourceKind: string;
  sourceId: string;
  /** GlobalSearch type key */
  typeKey: string;
  visibility: string;
  title: string;
  /** Pre-normalized or raw; Core normalizes before upsert. */
  aliasText?: string;
  metadataText?: string;
  customFieldText?: string;
  bodyText?: string;
  elevatedText?: string;
  /** Resolver id used later to build href for results. */
  hrefResolverId?: string;
  sourceUpdatedAt: Date;
}
