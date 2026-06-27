import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { SidebarCollapseToggle } from '@/components/layout/SidebarCollapseToggle';
import { useWiki } from '@/contexts/WikiContext';
import {
  campaignCategoryChildPath,
  campaignChronologyPath,
  campaignCreativeDriftPath,
  campaignDashboardPath,
  campaignNotesPath,
  campaignPartyPath,
  campaignRecentChangesPath,
  campaignSettingsPath,
  campaignRelationsPath,
  campaignProgressionPath,
  campaignVisualAtlasPath,
  campaignWorkspaceIndexPath,
} from '@/lib/campaignPaths';
import { CAMPAIGN_WORKSPACE_ROUTES } from '@/lib/campaignWorkspaceRoutes';
import {
  ADVENTURE_SIDEBAR_ITEMS,
  adventureSectionHref,
  type AdventureSidebarItem,
} from '@/lib/adventureLayout';
import {
  DOWNTIME_SIDEBAR_ITEMS,
  downtimeSectionHref,
  type DowntimeSidebarItem,
} from '@/lib/downtimeLayout';
import {
  SYSTEM_CATEGORY_DOWNTIME,
  SYSTEM_CATEGORY_NARRATIVE_THREADS,
  SYSTEM_CATEGORY_PARTY,
  SYSTEM_CATEGORY_QUESTS,
} from '@/lib/wikiSystemCategory';
import {
  SIDEBAR_SECTION_META,
  SIDEBAR_TOOLS_FIXED_IDS,
  SIDEBAR_TOP_FIXED_IDS,
  SIDEBAR_UTILITY_STUB_IDS,
  TIME_TRACKING_WIKI_TITLES,
  isFixedSectionVisible,
  type SidebarConfig,
  type SidebarOrderItem,
  type SidebarSectionId,
} from '@/lib/sidebarConfig';
import {
  translateSidebarItemLabel,
  translateSidebarSectionLabel,
  translateSidebarStatusLabel,
  translateSidebarZoneHeader,
  translateTimelineNavLabel,
} from '@/i18n/sidebarLabels';
import { SidebarNavIcon } from '@/components/SidebarNavIcon';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PluginSlotHost } from '@/plugins/slots';
import {
  isPluginPageActive,
  listPluginSidebarItems,
  pluginPagePath,
  type PluginSidebarSection,
} from '@/lib/pluginNavigation';
import { META_SECTION_LABEL_CLASS, SIDEBAR_ATMOSPHERE_CLASS, SIDEBAR_NAV_ITEM_CLASS, SIDEBAR_NAV_PRIMARY_CLASS } from '@/lib/surfaceLayout';

function NavItem({
  to,
  label,
  sectionId,
  config,
  indent = 0,
  statusLabel,
  onNavigate,
  end,
  collapsed = false,
}: {
  to: string;
  label: string;
  sectionId: SidebarSectionId;
  config: SidebarConfig;
  indent?: number;
  statusLabel?: string;
  onNavigate?: () => void;
  end?: boolean;
  collapsed?: boolean;
}) {
  if (collapsed && indent > 0) {
    return null;
  }

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      style={collapsed ? undefined : { paddingLeft: 8 + indent * 12 }}
      className={({ isActive }) =>
        [
          SIDEBAR_NAV_ITEM_CLASS,
          collapsed
            ? 'sidebar-nav-item--collapsed flex min-h-11 items-center justify-center rounded-md p-2'
            : 'flex min-h-11 items-center gap-2 rounded-md px-2 py-2 text-sm',
          isActive ? 'sidebar-nav-item--active' : '',
        ]
          .filter(Boolean)
          .join(' ')
      }
    >
      {indent === 0 || collapsed ? (
        <SidebarNavIcon config={config} sectionId={sectionId} />
      ) : null}
      {collapsed ? null : (
        <>
          <span className="min-w-0 truncate">{label}</span>
          {statusLabel ? (
            <span className="shrink-0 rounded bg-elevated/40 px-1.5 py-0.5 META_SECTION_LABEL_CLASS/80">
              {statusLabel}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

function ZoneHeading({ title, collapsed = false }: { title: string; collapsed?: boolean }) {
  if (collapsed) return null;
  return (
    <div className="mt-4 px-3 first:mt-2">
      <p className={META_SECTION_LABEL_CLASS}>{title}</p>
    </div>
  );
}

function AdventureNavGroup({
  item,
  config,
  adventureBase,
  resolveChildHref,
  isChildActive,
  onNavigate,
  collapsed = false,
}: {
  item: SidebarOrderItem;
  config: SidebarConfig;
  adventureBase: string;
  resolveChildHref: (child: AdventureSidebarItem) => string;
  isChildActive: (child: AdventureSidebarItem) => boolean;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const location = useLocation();
  const adventurePath = adventureBase.split('?')[0] ?? adventureBase;
  const childActive = ADVENTURE_SIDEBAR_ITEMS.some(isChildActive);
  const parentActive =
    location.pathname === adventurePath &&
    (location.search === '' ||
      location.search === '?section=story' ||
      location.search.startsWith('?section=story&')) &&
    !childActive;

  const [expanded, setExpanded] = useState(childActive || parentActive);

  useEffect(() => {
    if (childActive) setExpanded(true);
  }, [childActive, location.pathname, location.search]);

  const label = translateSidebarItemLabel(item);

  if (collapsed) {
    return (
      <NavLink
        to={adventureSectionHref(adventureBase, 'story')}
        onClick={onNavigate}
        title={label}
        aria-label={label}
        className={({ isActive }) =>
          [
            SIDEBAR_NAV_ITEM_CLASS,
            'sidebar-nav-item--collapsed flex min-h-11 items-center justify-center rounded-md p-2',
            isActive || parentActive || childActive ? 'sidebar-nav-item--active' : '',
          ]
            .filter(Boolean)
            .join(' ')
        }
      >
        <SidebarNavIcon config={config} sectionId="quests" />
      </NavLink>
    );
  }

  return (
    <div>
      <div className="flex min-h-11 items-stretch gap-0.5">
        <NavLink
          to={adventureSectionHref(adventureBase, 'story')}
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              SIDEBAR_NAV_ITEM_CLASS,
              'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-sm',
              isActive || parentActive || childActive ? 'sidebar-nav-item--active' : '',
            ]
              .filter(Boolean)
              .join(' ')
          }
        >
          <SidebarNavIcon config={config} sectionId="quests" />
          <span className="min-w-0 truncate">{label}</span>
        </NavLink>
        {ADVENTURE_SIDEBAR_ITEMS.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex shrink-0 items-center rounded-md px-1.5 text-muted transition-colors hover:bg-canvas/30 hover:text-foreground"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse Adventure sections' : 'Expand Adventure sections'}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : null}
      </div>
      {expanded ? (
        <div className="pb-1">
          {ADVENTURE_SIDEBAR_ITEMS.map((child) => (
            <NavItem
              key={`adventure-${child.sectionId}`}
              to={resolveChildHref(child)}
              label={child.label}
              sectionId={child.sectionId}
              config={config}
              indent={1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DowntimeNavGroup({
  item,
  config,
  downtimeBase,
  onNavigate,
  collapsed = false,
}: {
  item: SidebarOrderItem;
  config: SidebarConfig;
  downtimeBase: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const location = useLocation();
  const downtimePath = downtimeBase.split('?')[0] ?? downtimeBase;

  function isChildActive(child: DowntimeSidebarItem): boolean {
    if (location.pathname !== downtimePath) return false;
    return location.search === `?section=${child.id}`;
  }

  const childActive = DOWNTIME_SIDEBAR_ITEMS.some(isChildActive);
  const parentActive =
    location.pathname === downtimePath && location.search === '' && !childActive;

  const [expanded, setExpanded] = useState(childActive || parentActive);

  useEffect(() => {
    if (childActive) setExpanded(true);
  }, [childActive, location.pathname, location.search]);

  const label = translateSidebarItemLabel(item);

  if (collapsed) {
    return (
      <NavLink
        to={downtimeBase}
        end
        onClick={onNavigate}
        title={label}
        aria-label={label}
        className={({ isActive }) =>
          [
            SIDEBAR_NAV_ITEM_CLASS,
            'sidebar-nav-item--collapsed flex min-h-11 items-center justify-center rounded-md p-2',
            isActive || parentActive || childActive ? 'sidebar-nav-item--active' : '',
          ]
            .filter(Boolean)
            .join(' ')
        }
      >
        <SidebarNavIcon config={config} sectionId="downtime" />
      </NavLink>
    );
  }

  return (
    <div>
      <div className="flex min-h-11 items-stretch gap-0.5">
        <NavLink
          to={downtimeBase}
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              SIDEBAR_NAV_ITEM_CLASS,
              'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-sm',
              isActive || parentActive || childActive ? 'sidebar-nav-item--active' : '',
            ]
              .filter(Boolean)
              .join(' ')
          }
        >
          <SidebarNavIcon config={config} sectionId="downtime" />
          <span className="min-w-0 truncate">{label}</span>
        </NavLink>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex shrink-0 items-center rounded-md px-1.5 text-muted transition-colors hover:bg-canvas/30 hover:text-foreground"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse Downtime sections' : 'Expand Downtime sections'}
        >
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      </div>
      {expanded ? (
        <div className="pb-1">
          {DOWNTIME_SIDEBAR_ITEMS.map((child) => (
            <NavItem
              key={`downtime-${child.id}`}
              to={downtimeSectionHref(downtimeBase, child.id)}
              label={child.label}
              sectionId="downtime"
              config={config}
              indent={1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  onClose?: () => void;
  collapsed?: boolean;
}

export function Sidebar({
  className = '',
  onNavigate,
  onClose,
  collapsed = false,
}: SidebarProps) {
  useTranslation();
  const {
    campaignHandle,
    campaign,
    loading,
    error,
    flatPages,
    resolvePageId,
    resolvePageIdBySystemKey,
    sidebarConfig,
  } = useWiki();
  const location = useLocation();

  const canManageTemplates =
    campaign?.role === 'GAMEMASTER' || campaign?.role === 'WRITER';

  function workspaceIndexHref(sectionId: SidebarSectionId): string {
    const route = CAMPAIGN_WORKSPACE_ROUTES.find((entry) => entry.sidebarId === sectionId);
    if (route) {
      return campaignWorkspaceIndexPath(campaignHandle, route.segment);
    }
    const meta = SIDEBAR_SECTION_META[sectionId];
    if (meta?.wikiTitle) {
      const byTitle = CAMPAIGN_WORKSPACE_ROUTES.find(
        (entry) =>
          entry.indexResolver.type === 'wikiTitle' &&
          entry.indexResolver.title === meta.wikiTitle,
      );
      if (byTitle) {
        return campaignWorkspaceIndexPath(campaignHandle, byTitle.segment);
      }
    }
    return campaignDashboardPath(campaignHandle);
  }

  function wikiHrefForSection(sectionId: SidebarSectionId, _title: string): string {
    return workspaceIndexHref(sectionId);
  }

  function wikiEntityHref(pageId: string, categoryTitle?: string): string {
    return campaignCategoryChildPath(campaignHandle, pageId, categoryTitle, flatPages);
  }

  const adventureBase = wikiHrefForSection('quests', 'Adventure');
  const downtimeBase = wikiHrefForSection('downtime', 'Downtime');

  function resolveAdventureChildHref(child: AdventureSidebarItem): string {
    if (child.kind === 'wiki') {
      return wikiHrefForSection(child.sectionId, SIDEBAR_SECTION_META[child.sectionId].wikiTitle!);
    }
    return campaignCreativeDriftPath(campaignHandle);
  }

  function isAdventureChildActive(child: AdventureSidebarItem): boolean {
    if (child.kind === 'wiki') {
      const href = wikiHrefForSection(
        child.sectionId,
        SIDEBAR_SECTION_META[child.sectionId].wikiTitle!,
      );
      return location.pathname === href.split('?')[0];
    }
    return location.pathname === campaignCreativeDriftPath(campaignHandle);
  }

  function renderFixedSection(sectionId: SidebarSectionId) {
    if (!isFixedSectionVisible(sidebarConfig, sectionId)) {
      return null;
    }

    const meta = SIDEBAR_SECTION_META[sectionId];

    if (sectionId === 'party') {
      return (
        <NavItem
          key={sectionId}
          to={campaignPartyPath(campaignHandle)}
          label={translateSidebarSectionLabel(sectionId)}
          sectionId={sectionId}
          config={sidebarConfig}
          onNavigate={onNavigate}
          statusLabel={translateSidebarStatusLabel(meta.statusLabel)}
          collapsed={collapsed}
        />
      );
    }

    if (meta.route === 'visual-atlas') {
      return (
        <NavItem
          key={sectionId}
          to={campaignVisualAtlasPath(campaignHandle)}
          label={translateSidebarSectionLabel(sectionId)}
          sectionId={sectionId}
          config={sidebarConfig}
          onNavigate={onNavigate}
          statusLabel={translateSidebarStatusLabel(meta.statusLabel)}
          collapsed={collapsed}
        />
      );
    }

    if (meta.route === 'relations') {
      return (
        <NavItem
          key={sectionId}
          to={campaignRelationsPath(campaignHandle)}
          label={translateSidebarSectionLabel(sectionId)}
          sectionId={sectionId}
          config={sidebarConfig}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      );
    }

    if (meta.route === 'progression') {
      if (!canManageTemplates) return null;
      return (
        <NavItem
          key={sectionId}
          to={campaignProgressionPath(campaignHandle)}
          label={translateSidebarSectionLabel(sectionId)}
          sectionId={sectionId}
          config={sidebarConfig}
          onNavigate={onNavigate}
          statusLabel={translateSidebarStatusLabel(meta.statusLabel)}
          collapsed={collapsed}
        />
      );
    }

    if (sectionId === 'recent-changes') {
      return (
        <NavItem
          key={sectionId}
          to={campaignRecentChangesPath(campaignHandle)}
          label={translateSidebarSectionLabel(sectionId)}
          sectionId={sectionId}
          config={sidebarConfig}
          onNavigate={onNavigate}
          statusLabel={translateSidebarStatusLabel(meta.statusLabel)}
          collapsed={collapsed}
        />
      );
    }

    if (meta.route === 'settings') {
      if (!canManageTemplates) return null;
      return (
        <NavItem
          key={sectionId}
          to={campaignSettingsPath(campaignHandle)}
          label={translateSidebarSectionLabel(sectionId)}
          sectionId={sectionId}
          config={sidebarConfig}
          onNavigate={onNavigate}
          statusLabel={translateSidebarStatusLabel(meta.statusLabel)}
          collapsed={collapsed}
        />
      );
    }

    if (meta.wikiTitle) {
      return (
        <NavItem
          key={sectionId}
          to={wikiHrefForSection(sectionId, meta.wikiTitle)}
          label={translateSidebarSectionLabel(sectionId)}
          sectionId={sectionId}
          config={sidebarConfig}
          onNavigate={onNavigate}
          statusLabel={translateSidebarStatusLabel(meta.statusLabel)}
          collapsed={collapsed}
        />
      );
    }

    return null;
  }

  function renderWikiModule(item: SidebarOrderItem) {
    const sectionId = item.id as SidebarSectionId;
    const meta = SIDEBAR_SECTION_META[sectionId];
    if (!meta?.wikiTitle) return null;

    return (
      <NavItem
        key={item.id}
        to={wikiHrefForSection(sectionId, meta.wikiTitle)}
        label={translateSidebarItemLabel(item)}
        sectionId={sectionId}
        config={sidebarConfig}
        onNavigate={onNavigate}
        collapsed={collapsed}
      />
    );
  }

  function renderTimelineLinks() {
    return TIME_TRACKING_WIKI_TITLES.map((title) => {
      const view =
        title === 'Calendars'
          ? 'calendar'
          : title === 'Timelines'
            ? 'timeline'
            : 'events';
      return (
        <NavItem
          key={`timeline-${title}`}
          to={campaignChronologyPath(campaignHandle, view)}
          label={translateTimelineNavLabel(title)}
          sectionId="timeTracking"
          config={sidebarConfig}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      );
    });
  }

  function renderSessionNotes(item: SidebarOrderItem) {
    const sectionId = item.id as SidebarSectionId;

    return (
      <NavItem
        key={item.id}
        to={campaignNotesPath(campaignHandle)}
        label={translateSidebarItemLabel(item)}
        sectionId={sectionId}
        config={sidebarConfig}
        onNavigate={onNavigate}
        collapsed={collapsed}
      />
    );
  }

  function renderPlayBucketItem(item: SidebarOrderItem): ReactNode {
    if (!item.enabled) return null;

    if (item.id === 'quests') {
      return (
        <AdventureNavGroup
          key={item.id}
          item={item}
          config={sidebarConfig}
          adventureBase={adventureBase}
          resolveChildHref={resolveAdventureChildHref}
          isChildActive={isAdventureChildActive}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      );
    }
    if (item.id === 'downtime') {
      return (
        <DowntimeNavGroup
          key={item.id}
          item={item}
          config={sidebarConfig}
          downtimeBase={downtimeBase}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      );
    }
    if (item.id === 'progression') {
      if (!canManageTemplates) return null;
      return (
        <NavItem
          key={item.id}
          to={campaignProgressionPath(campaignHandle)}
          label={translateSidebarItemLabel(item)}
          sectionId="progression"
          config={sidebarConfig}
          onNavigate={onNavigate}
          statusLabel={translateSidebarStatusLabel(
            SIDEBAR_SECTION_META.progression.statusLabel,
          )}
          collapsed={collapsed}
        />
      );
    }
    if (item.id === 'sessionNotes') {
      return renderSessionNotes(item);
    }
    return renderWikiModule(item);
  }

  function renderWorldBucketItem(item: SidebarOrderItem): ReactNode {
    if (!item.enabled) return null;
    if (item.id === 'relations') {
      return (
        <NavItem
          key={item.id}
          to={campaignRelationsPath(campaignHandle)}
          label={translateSidebarItemLabel(item)}
          sectionId="relations"
          config={sidebarConfig}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      );
    }
    return renderWikiModule(item);
  }

  function renderToolsBucketItem(item: SidebarOrderItem): ReactNode {
    if (!item.enabled) return null;
    return renderWikiModule(item);
  }

  function renderPluginSidebarItems(section: PluginSidebarSection): ReactNode {
    return listPluginSidebarItems(section).map((item) => {
      const to = pluginPagePath(campaignHandle, item.pluginId, item.pageId);
      const active = isPluginPageActive(location.pathname, item.pluginId, item.pageId);
      return (
        <NavLink
          key={`plugin-${item.pluginId}-${item.id}`}
          to={to}
          onClick={onNavigate}
          title={collapsed ? item.label : undefined}
          className={() =>
            [
              SIDEBAR_NAV_ITEM_CLASS,
              collapsed
                ? 'sidebar-nav-item--collapsed flex min-h-11 items-center justify-center rounded-md p-2'
                : 'flex min-h-11 items-center gap-2 rounded-md px-2 py-2 text-sm',
              active ? 'sidebar-nav-item--active' : '',
            ]
              .filter(Boolean)
              .join(' ')
          }
        >
          {!collapsed ? item.label : item.label.slice(0, 1)}
        </NavLink>
      );
    });
  }

  function renderPlaySection() {
    return (
      <>
        <ZoneHeading
          title={translateSidebarZoneHeader('play', sidebarConfig.headers.play)}
          collapsed={collapsed}
        />
        {sidebarConfig.playOrder.map((item) => renderPlayBucketItem(item))}
        {renderPluginSidebarItems('play')}
      </>
    );
  }

  function renderWorldSection() {
    return (
      <>
        <ZoneHeading
          title={translateSidebarZoneHeader('world', sidebarConfig.headers.world)}
          collapsed={collapsed}
        />
        {sidebarConfig.worldLoreOrder.map((item) => renderWorldBucketItem(item))}
        {renderPluginSidebarItems('world')}
      </>
    );
  }

  function renderTimelineSection() {
    return (
      <>
        <ZoneHeading
          title={translateSidebarZoneHeader('timeline', sidebarConfig.headers.timeline)}
          collapsed={collapsed}
        />
        {renderTimelineLinks()}
        {renderPluginSidebarItems('timeline')}
      </>
    );
  }

  function renderToolsSection() {
    return (
      <>
        <ZoneHeading
          title={translateSidebarZoneHeader('tools', sidebarConfig.headers.tools)}
          collapsed={collapsed}
        />
        {sidebarConfig.toolsOrder.map((item) => renderToolsBucketItem(item))}
        {renderPluginSidebarItems('tools')}
        {SIDEBAR_TOOLS_FIXED_IDS.map((id) => renderFixedSection(id))}
        {SIDEBAR_UTILITY_STUB_IDS.map((id) => renderFixedSection(id))}
      </>
    );
  }

  return (
    <aside
      className={`${SIDEBAR_ATMOSPHERE_CLASS} sidebar-shell relative flex h-full shrink-0 flex-col transition-[width] duration-200 ${
        collapsed
          ? 'sidebar-shell--collapsed w-14 max-w-14'
          : 'w-72 max-w-[min(18rem,85vw)]'
      } ${className}`}
    >
      {onClose ? (
        <div className="flex justify-end px-2 pt-2 lg:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-canvas/30 hover:text-foreground"
            aria-label="Close campaign menu"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {error && !collapsed ? (
        <p className="mx-2 mt-2 rounded-md bg-red-950/40 px-2 py-1.5 text-xs text-red-300">
          {error}
        </p>
      ) : null}

      <nav
        className={`flex-1 overflow-y-auto py-2 ${collapsed ? 'px-0.5' : 'px-1'} ${
          !onClose ? 'lg:pr-3.5' : ''
        }`}
      >
        {loading && !campaign ? (
          <div className="py-8">
            <LoadingSpinner label="Loading navigation…" />
          </div>
        ) : (
          <div className={SIDEBAR_NAV_PRIMARY_CLASS}>
            {SIDEBAR_TOP_FIXED_IDS.map((id) => renderFixedSection(id))}
            {renderPluginSidebarItems('campaign')}
            {renderPlaySection()}
            {renderWorldSection()}
            {renderTimelineSection()}
            {renderToolsSection()}
          </div>
        )}
      </nav>

      {!collapsed ? (
        <PluginSlotHost
          slot="sidebar"
          className="px-2 pb-3"
          context={{
            campaignId: campaign?.id,
            campaignHandle,
            config: {},
          }}
        />
      ) : null}

      {!onClose ? <SidebarCollapseToggle /> : null}
    </aside>
  );
}
