import {
  DOWNTIME_SECTIONS,
  type DowntimeSectionId,
} from '@shared/downtimeHub';
import type { DowntimeHubPayload } from '@/lib/downtime';

export {
  DOWNTIME_SECTIONS,
  type DowntimeSectionId,
};

export type DowntimeSidebarItem = {
  kind: 'section';
  id: DowntimeSectionId;
  label: string;
};

export const DOWNTIME_SIDEBAR_ITEMS: DowntimeSidebarItem[] = DOWNTIME_SECTIONS.map(
  (section) => ({
    kind: 'section' as const,
    id: section.id,
    label: section.label,
  }),
);

export function readDowntimeSectionFromSearch(search: string): DowntimeSectionId | null {
  const params = new URLSearchParams(search);
  const section = params.get('section');
  if (!section) return null;
  if (section === 'worldevents') return 'worldEvents';
  if (DOWNTIME_SECTIONS.some((s) => s.id === section)) {
    return section as DowntimeSectionId;
  }
  return null;
}

export function downtimeSectionHref(
  basePath: string,
  section: DowntimeSectionId,
): string {
  return `${basePath}?section=${section}`;
}

export function isDowntimeOverviewSearch(search: string): boolean {
  return readDowntimeSectionFromSearch(search) == null;
}

export type DowntimeSectionHeaderConfig = {
  displayTitle: string;
  countSingular: string;
  countPlural?: string;
  createLabel?: string;
};

export const DOWNTIME_SECTION_HEADER_CONFIG: Record<
  DowntimeSectionId,
  DowntimeSectionHeaderConfig
> = {
  projects: {
    displayTitle: 'Projects',
    countSingular: 'operation',
    countPlural: 'operations',
    createLabel: 'New operation',
  },
  havens: {
    displayTitle: 'Havens',
    countSingular: 'haven',
    createLabel: 'New haven',
  },
  ledger: {
    displayTitle: 'Ledger',
    countSingular: 'entry',
    countPlural: 'entries',
    createLabel: 'Add entry',
  },
  worldEvents: {
    displayTitle: 'World Events',
    countSingular: 'event',
  },
  reputation: {
    displayTitle: 'Reputation',
    countSingular: 'faction',
  },
};

export function resolveDowntimeSectionHeaderConfig(
  section: DowntimeSectionId | null,
): DowntimeSectionHeaderConfig | null {
  if (!section) {
    return { displayTitle: 'Downtime', countSingular: 'section' };
  }
  return DOWNTIME_SECTION_HEADER_CONFIG[section] ?? null;
}

export function resolveDowntimeSectionItemCount(
  section: DowntimeSectionId | null,
  data: DowntimeHubPayload | null,
): number {
  if (!data || !section) return 0;
  switch (section) {
    case 'projects':
      return data.projects?.cards.length ?? 0;
    case 'havens':
      return data.havens?.cards.length ?? 0;
    case 'ledger':
      return data.ledger?.feed.length ?? 0;
    case 'worldEvents':
      return data.worldEvents?.feed.length ?? 0;
    case 'reputation':
      return data.reputation?.standings.length ?? 0;
    default:
      return 0;
  }
}
