/** OPDS 2.0 JSON feed primitives. Callers must authorize and project all inputs. */
export const OPDS_MEDIA_TYPE = 'application/opds+json';

export interface OpdsLink {
  href: string;
  rel?: string;
  type?: string;
  title?: string;
}

export interface OpdsPublicationInput {
  id: string;
  title: string;
  modified?: Date | null;
  description?: string | null;
  category?: string | null;
  image?: OpdsLink | null;
  reading: OpdsLink;
  canonical: OpdsLink;
}

/** Adapt an already-authorized page summary without fetching its full body. */
export function pageToPublication(page: OpdsPublicationInput) {
  const description = page.description?.trim();
  const category = page.category?.trim();
  return {
    metadata: {
      '@type': 'http://schema.org/Book',
      identifier: page.id,
      title: page.title,
      ...(page.modified ? { modified: page.modified.toISOString() } : {}),
      ...(description ? { description } : {}),
      ...(category ? { subject: [{ name: category }] } : {}),
    },
    links: [
      { ...page.reading, rel: 'http://opds-spec.org/acquisition' },
      { ...page.canonical, rel: 'alternate' },
    ],
    ...(page.image ? { images: [page.image] } : {}),
  };
}

export interface OpdsFeedInput {
  title: string;
  description?: string | null;
  links: OpdsLink[];
  navigation?: OpdsLink[];
  publications?: ReturnType<typeof pageToPublication>[];
  numberOfItems?: number;
  itemsPerPage?: number;
  currentPage?: number;
}

export function buildOpdsFeed(feed: OpdsFeedInput) {
  return {
    metadata: {
      title: feed.title,
      ...(feed.description ? { description: feed.description } : {}),
      ...(feed.numberOfItems != null ? { numberOfItems: feed.numberOfItems } : {}),
      ...(feed.itemsPerPage != null ? { itemsPerPage: feed.itemsPerPage } : {}),
      ...(feed.currentPage != null ? { currentPage: feed.currentPage } : {}),
    },
    links: feed.links,
    ...(feed.navigation ? { navigation: feed.navigation } : {}),
    ...(feed.publications ? { publications: feed.publications } : {}),
  };
}
