import { Link } from 'react-router-dom';
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
}

export function WikiPageEditorHeader({
  campaignHandle,
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
  ...toolbarProps
}: WikiPageEditorHeaderProps) {
  const entityKind = resolveEntityKindLabel(profileKey, templateType);

  return (
    <div className={`mb-1 ${surfaceHeaderChromeClass(true)}`}>
      <WikiPageBreadcrumbs crumbs={crumbs} campaignHandle={campaignHandle} />

      <div className="mt-1 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h1
            className={`${TYPE_DISPLAY_CLASS} text-2xl text-focal-foreground sm:text-3xl`}
          >
            {displayTitle}
          </h1>
          {entityKind ? (
            <p className={`${TYPE_META_CLASS} mt-0.5 text-muted`}>{entityKind}</p>
          ) : null}
        </div>

        <WikiPageRuntimeToolbar
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
