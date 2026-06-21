import { i18n } from '@/i18n/initI18n';
import type { SidebarOrderItem, SidebarSectionId } from '@/lib/sidebarConfig';
import { SIDEBAR_SECTION_META } from '@/lib/sidebarConfig';

function sectionIdToKeySuffix(sectionId: SidebarSectionId): string {
  return sectionId.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

const ZONE_HEADER_KEYS = {
  play: 'navigation.sidebar.zonePlay',
  world: 'navigation.sidebar.zoneWorld',
  timeline: 'navigation.sidebar.zoneTimeline',
  tools: 'navigation.sidebar.zoneTools',
} as const;

const TIMELINE_TITLE_KEYS: Record<string, string> = {
  Calendars: 'navigation.sidebar.calendars',
  Timelines: 'navigation.sidebar.timelines',
  Events: 'navigation.sidebar.events',
};

export function translateSidebarSectionLabel(sectionId: SidebarSectionId): string {
  const key = `navigation.sidebar.${sectionIdToKeySuffix(sectionId)}`;
  if (i18n.exists(key)) return i18n.t(key);
  return SIDEBAR_SECTION_META[sectionId].label;
}

export function translateSidebarItemLabel(item: SidebarOrderItem): string {
  const custom = item.customLabel?.trim();
  if (custom) return custom;
  return translateSidebarSectionLabel(item.id as SidebarSectionId);
}

export function translateSidebarZoneHeader(
  zone: keyof typeof ZONE_HEADER_KEYS,
  storedLabel?: string,
): string {
  const key = ZONE_HEADER_KEYS[zone];
  if (i18n.exists(key)) return i18n.t(key);
  return storedLabel ?? zone.toUpperCase();
}

export function translateTimelineNavLabel(title: string): string {
  const key = TIMELINE_TITLE_KEYS[title];
  if (key && i18n.exists(key)) return i18n.t(key);
  return title;
}

export function translateSidebarStatusLabel(
  statusLabel: string | undefined,
): string | undefined {
  if (!statusLabel) return undefined;
  if (statusLabel === 'Planned') {
    return i18n.exists('navigation.sidebar.statusPlanned')
      ? i18n.t('navigation.sidebar.statusPlanned')
      : statusLabel;
  }
  if (statusLabel === 'DM') {
    return i18n.exists('navigation.sidebar.statusDm')
      ? i18n.t('navigation.sidebar.statusDm')
      : statusLabel;
  }
  return statusLabel;
}
