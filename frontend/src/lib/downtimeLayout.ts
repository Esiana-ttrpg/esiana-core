import {
  DOWNTIME_SECTIONS,
  type DowntimeSectionId,
} from '@shared/downtimeHub';

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
