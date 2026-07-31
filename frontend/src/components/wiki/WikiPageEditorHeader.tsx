import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import type { EntitySubviewDef, EntitySubviewId } from '@/lib/entityPageShells/types';
import { resolveEntityKindLabel } from '@/lib/wikiPageHeaderMeta';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import {
  surfaceHeaderChromeClass,
  TYPE_DISPLAY_CLASS,
  TYPE_META_CLASS,
} from '@/lib/surfaceLayout';
import { WikiPageBreadcrumbs } from '@/components/wiki/WikiPageBreadcrumbs';
import { WikiPageRuntimeToolbar } from '@/components/wiki/WikiPageRuntimeToolbar';
import { EntitySubviewNav } from '@/components/entity/shells/EntitySubviewNav';
import type { WikiPageBlock } from '@/types/wiki';

interface WikiBreadcrumb {
  id: string;
  title: string;
}

interface WikiPageEditorHeaderProps {
  campaignHandle: string;
  pageId?: string;
  canOpenWorkshop?: boolean;
  confirmWorkshopLeave?: boolean;
  crumbs: WikiBreadcrumb[];
  displayTitle: string;
  profileKey: SurfaceProfileKey;
  templateType: string;
  showSectionSubviews: boolean;
  subviews: EntitySubviewDef[];
  activeSubview: EntitySubviewId;
  onSubviewChange: (id: EntitySubviewId) => void;
  isDMUser?: boolean;
  isTagsHub: boolean;
  isLayoutDirty?: boolean;
  isSaving: boolean;
  onSavePage?: () => void | Promise<void>;
  isPinned: boolean;
  isSearchOpen: boolean;
  isEditingPage: boolean;
  showGridLines: boolean;
  canDeleteWikiPage: boolean;
  widgetOptions: Array<{ value: string; label: string; group?: string }>;
  onTogglePin: () => void;
  onToggleSearch: () => void;
  onToggleEditPage: () => void;
  onToggleGridLines: () => void;
  onOpenPageSettings?: () => void;
  onAddWidget: (type: WikiPageBlock['type']) => void;
  onDeletePage: () => void;
  havenBackLink?: { to: string; label: string } | null;
  /** Character page: edit wiki page title in the h1 slot */
  editablePageTitle?: boolean;
  pageTitleForEdit?: string;
  onPageTitleForEditChange?: (value: string) => void;
  onPageTitleForEditBlur?: () => void | Promise<void>;
  titleFocusField?: string | null;
}

const titleInputClass = `${TYPE_DISPLAY_CLASS} w-full min-w-0 rounded-md border border-transparent bg-transparent px-0 py-0 text-2xl text-focal-foreground outline-none focus:border-border/60 focus:bg-surface/30 sm:text-3xl`;

export function WikiPageEditorHeader({
  campaignHandle,
  pageId,
  canOpenWorkshop,
  confirmWorkshopLeave,
  crumbs,
  displayTitle,
  profileKey,
  templateType,
  showSectionSubviews,
  subviews,
  activeSubview,
  onSubviewChange,
  isDMUser,
  isTagsHub,
  havenBackLink,
  editablePageTitle = false,
  pageTitleForEdit,
  onPageTitleForEditChange,
  onPageTitleForEditBlur,
  titleFocusField,
  ...toolbarProps
}: WikiPageEditorHeaderProps) {
  const entityKind = resolveEntityKindLabel(profileKey, templateType);
  const showTitleEditor =
    editablePageTitle &&
    toolbarProps.isEditingPage &&
    isDMUser &&
    onPageTitleForEditChange != null;
  const titleValue = pageTitleForEdit ?? displayTitle;

  useEffect(() => {
    if (!titleFocusField || titleFocusField !== 'character-field-name') return;
    const el = document.getElementById('character-field-name');
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      if (el instanceof HTMLInputElement) el.focus();
    });
  }, [titleFocusField, showTitleEditor]);

  return (
    <div className={`mb-1 ${surfaceHeaderChromeClass(true)}`}>
      <WikiPageBreadcrumbs crumbs={crumbs} campaignHandle={campaignHandle} />

      <div className="mt-1 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          {showTitleEditor ? (
            <input
              id="character-field-name"
              type="text"
              className={titleInputClass}
              value={titleValue}
              onChange={(e) => onPageTitleForEditChange(e.target.value)}
              onBlur={() => void onPageTitleForEditBlur?.()}
              aria-label="Character name"
            />
          ) : (
            <h1
              className={`${TYPE_DISPLAY_CLASS} text-2xl text-focal-foreground sm:text-3xl`}
            >
              {displayTitle}
            </h1>
          )}
          {entityKind ? (
            <p className={`${TYPE_META_CLASS} mt-0.5 text-muted`}>{entityKind}</p>
          ) : null}
        </div>

        <WikiPageRuntimeToolbar
          campaignHandle={campaignHandle}
          pageId={pageId}
          canOpenWorkshop={canOpenWorkshop}
          confirmWorkshopLeave={confirmWorkshopLeave}
          isDMUser={isDMUser}
          isTagsHub={isTagsHub}
          {...toolbarProps}
        />
      </div>

      {havenBackLink ? (
        <Link
          to={havenBackLink.to}
          className="mt-1 inline-block text-sm text-primary hover:underline"
        >
          {havenBackLink.label}
        </Link>
      ) : null}

      {toolbarProps.isSearchOpen && !isTagsHub ? (
        <div className="mt-2">
          <input
            type="search"
            placeholder="Search this page…"
            className="w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
            aria-label="Search this page"
          />
        </div>
      ) : null}

      {showSectionSubviews ? (
        <EntitySubviewNav
          subviews={subviews}
          activeSubview={activeSubview}
          onSubviewChange={onSubviewChange}
          isDMUser={isDMUser}
        />
      ) : null}
    </div>
  );
}
