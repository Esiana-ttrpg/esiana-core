import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
/**
 * wikiLink inline node view.
 *
 * Touch (read): tap selects + preview; second tap navigates; long-press opens actions.
 * Touch (edit): tap opens stub resolve menu; long-press removes link.
 * Desktop: hover preview; click navigates (read); unresolved opens resolve menu.
 *
 * Keyboard: see wikiLinkKeyboard.ts (arrows, Enter, Backspace/Delete, Escape).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useOptionalWiki } from '@/contexts/WikiContext';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { formatWikiTemplateType } from '@/lib/formatWikiTemplateType';
import { resolveWikiCodexType } from '@/lib/resolveWikiCodexType';
import { fetchWikiPagePreview, type WikiPagePreview } from '@/lib/wikiLoreGraph';
import { useWikiLinkIndex } from '../hooks/useWikiLinkIndex';
import type { WikiLinkAttributes } from './WikiLinkExtension';
import { CampaignMemberRoles } from '@/types/domain';
import { resolveWikiSuggestion } from './wikiReferenceInsertion';
import {
  narrativeStatusLinkClassName,
} from '@/components/wiki/NarrativeStatusBadge';
import {
  isTouchDevice,
  WIKI_LINK_LONG_PRESS_MS,
} from './wikiLinkInteraction';
import {
  handleWikiLinkEscapeSelection,
  isWikiLinkNodeSelection,
} from './wikiLinkKeyboard';

function WikiLinkMarginNote({
  typeLabel,
  title,
  summary,
  inboundLinkCount,
  wordCount,
  narrativeStatusLabel,
}: {
  typeLabel: string | null;
  title: string;
  summary: string | null;
  inboundLinkCount?: number;
  wordCount?: number;
  narrativeStatusLabel?: string | null;
}) {
  return (
    <span className="wiki-link-margin-note pointer-events-none absolute left-0 top-full z-50 mt-1 w-56 rounded border border-border bg-background/95 p-2 text-xs shadow-md">
      {typeLabel ? (
        <span className={META_SECTION_LABEL_CLASS}>
          {typeLabel}
        </span>
      ) : null}
      {narrativeStatusLabel ? (
        <span className="mt-0.5 block text-[10px] font-medium text-muted">
          Canon: {narrativeStatusLabel}
        </span>
      ) : null}
      <span
        className={`block font-normal text-foreground${typeLabel ? ' mt-0.5' : ''}`}
      >
        {title}
      </span>
      {summary ? (
        <p className="mt-1 line-clamp-3 font-normal text-muted">{summary}</p>
      ) : null}
      {inboundLinkCount !== undefined && wordCount !== undefined ? (
        <p className="mt-1 text-[10px] text-muted">
          {inboundLinkCount} inbound · {wordCount} words
        </p>
      ) : null}
    </span>
  );
}

export function WikiLinkNodeView({
  node,
  selected,
  updateAttributes,
  editor,
  deleteNode,
}: NodeViewProps) {
  const attrs = node.attrs as WikiLinkAttributes;
  const resolved = Boolean(attrs.targetPageId && attrs.resolved !== false);
  const isEditing = editor.isEditable;
  const touch = isTouchDevice();
  const wiki = useOptionalWiki();
  const navigate = useNavigate();
  const campaignHandle = wiki?.campaignHandle ?? '';
  const flatPages = wiki?.flatPages ?? [];
  const { index } = useWikiLinkIndex(campaignHandle);

  const [menuOpen, setMenuOpen] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [stubSearch, setStubSearch] = useState('');
  const [touchSelected, setTouchSelected] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [preview, setPreview] = useState<WikiPagePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const indexEntry = useMemo(
    () => index.find((e) => e.pageId === attrs.targetPageId),
    [index, attrs.targetPageId],
  );

  const isManager =
    wiki?.campaign?.role === CampaignMemberRoles.GAMEMASTER ||
    wiki?.campaign?.role === CampaignMemberRoles.WRITER;
  const targetDiscovered =
    !attrs.targetPageId ||
    index.some((entry) => entry.pageId === attrs.targetPageId);
  const isUndiscoveredForParty =
    !isEditing && resolved && Boolean(attrs.targetPageId) && !isManager && !targetDiscovered;
  const presenceHidden =
    isManager &&
    (indexEntry?.presenceState === 'HIDDEN' ||
      indexEntry?.presenceState === 'DRAFT');

  const flatPage = useMemo(
    () => wiki?.flatPages?.find((p) => p.id === attrs.targetPageId),
    [wiki?.flatPages, attrs.targetPageId],
  );

  const codexType = useMemo(() => {
    if (preview?.codexType) return preview.codexType;
    if (indexEntry?.codexType) return indexEntry.codexType;
    if (flatPage) {
      return resolveWikiCodexType({
        templateType: flatPage.templateType,
        metadata: flatPage.metadata,
      });
    }
    if (preview?.templateType || indexEntry?.templateType) {
      return resolveWikiCodexType({
        templateType: preview?.templateType ?? indexEntry?.templateType ?? 'DEFAULT',
        metadata: undefined,
      });
    }
    return 'DEFAULT';
  }, [preview, indexEntry, flatPage]);

  const typeLabel = useMemo(() => {
    if (!codexType || codexType === 'DEFAULT') return null;
    return formatWikiTemplateType(codexType);
  }, [codexType]);

  const marginNoteTitle = preview?.title ?? indexEntry?.title ?? attrs.label;

  const accessibleTitle = useMemo(() => {
    if (!resolved) return 'Unresolved codex link';
    if (typeLabel) return `${typeLabel} — ${marginNoteTitle}`;
    return marginNoteTitle;
  }, [resolved, typeLabel, marginNoteTitle]);

  const loadPreview = useCallback(
    async (pageId: string) => {
      if (!campaignHandle || !pageId) return;
      setPreviewLoading(true);
      try {
        setPreview(await fetchWikiPagePreview(campaignHandle, pageId));
      } catch {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    },
    [campaignHandle],
  );

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerEnter = () => {
    if (touch || !resolved || !attrs.targetPageId) return;
    setHovering(true);
    hoverTimer.current = setTimeout(() => {
      void loadPreview(attrs.targetPageId!);
    }, 250);
  };

  const handlePointerLeave = () => {
    setHovering(false);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setPreview(null);
    setPreviewLoading(false);
    clearLongPress();
  };

  const startLongPress = useCallback(() => {
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      if (isEditing) {
        deleteNode?.();
      } else {
        setActionSheetOpen(true);
      }
    }, WIKI_LINK_LONG_PRESS_MS);
  }, [clearLongPress, deleteNode, isEditing]);

  const openResolveMenu = useCallback(() => {
    setStubSearch(attrs.label);
    setMenuOpen(true);
  }, [attrs.label]);

  useEffect(() => {
    if (!menuOpen && !actionSheetOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(false);
        setActionSheetOpen(false);
        setStubSearch('');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, actionSheetOpen]);

  useEffect(() => {
    if (!selected) return;
    const onTransaction = () => {
      const storage = editor.storage.wikiLink as
        | { enterAction?: { type: 'navigate' | 'resolve'; pageId?: string } | null }
        | undefined;
      const action = storage?.enterAction;
      if (!action) return;
      storage!.enterAction = null;
      if (action.type === 'navigate' && action.pageId && campaignHandle) {
        navigate(campaignWikiPath(campaignHandle, action.pageId, flatPages));
      } else if (action.type === 'resolve') {
        openResolveMenu();
      }
    };
    editor.on('transaction', onTransaction);
    return () => {
      editor.off('transaction', onTransaction);
    };
  }, [selected, editor, campaignHandle, navigate, openResolveMenu]);

  useEffect(() => {
    if (!selected) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && (menuOpen || actionSheetOpen)) return;
      if (e.key === 'Escape' && isWikiLinkNodeSelection(editor.state)) {
        e.preventDefault();
        handleWikiLinkEscapeSelection(editor);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected, editor, menuOpen, actionSheetOpen]);

  const handleUnresolvedTap = (e: React.MouseEvent) => {
    if (resolved) return;
    e.preventDefault();
    e.stopPropagation();
    openResolveMenu();
  };

  const handleReadLinkClick = useCallback(
    (e: React.MouseEvent) => {
      if (!touch || !resolved || !attrs.targetPageId || !campaignHandle) return;
      e.preventDefault();
      e.stopPropagation();
      if (touchSelected) {
        navigate(campaignWikiPath(campaignHandle, attrs.targetPageId, flatPages));
        setTouchSelected(false);
      } else {
        setTouchSelected(true);
        void loadPreview(attrs.targetPageId);
      }
    },
    [
      attrs.targetPageId,
      campaignHandle,
      loadPreview,
      navigate,
      resolved,
      touch,
      touchSelected,
    ],
  );

  const handleReadNavigate = useCallback(
    (e: React.KeyboardEvent) => {
      if (isEditing || !resolved || !attrs.targetPageId || !campaignHandle) return;
      if (e.key !== 'Enter') return;
      e.preventDefault();
      navigate(campaignWikiPath(campaignHandle, attrs.targetPageId, flatPages));
    },
    [attrs.targetPageId, campaignHandle, isEditing, navigate, resolved],
  );

  const linkToExisting = (pageId: string, label: string) => {
    updateAttributes({
      targetPageId: pageId,
      label,
      resolved: true,
    });
    setMenuOpen(false);
    setStubSearch('');
  };

  const markIgnored = () => {
    updateAttributes({ resolved: false, targetPageId: null });
    setMenuOpen(false);
    setStubSearch('');
  };

  const stubMatches = useMemo(() => {
    const q = stubSearch.trim() || attrs.label;
    return resolveWikiSuggestion(q, index, { limit: 8 });
  }, [stubSearch, attrs.label, index]);

  const narrativeStatusClass = narrativeStatusLinkClassName(
    indexEntry?.narrativeStatus,
  );

  const showMarginNote =
    (hovering || (touch && touchSelected)) && resolved && !isEditing;

  const inlineLabel = isEditing ? `[[${attrs.label}]]` : attrs.label;

  const sharedDataAttrs = {
    'data-type': 'wikiLink' as const,
    'data-id': attrs.targetPageId ?? '',
    'data-label': attrs.label,
    ...(resolved ? {} : { 'data-stub': 'true' as const }),
  };

  const touchHandlers = touch
    ? {
        onTouchStart: () => startLongPress(),
        onTouchEnd: clearLongPress,
        onTouchMove: clearLongPress,
      }
    : {};

  const hoverHandlers = touch
    ? {}
    : {
        onMouseEnter: handlePointerEnter,
        onMouseLeave: handlePointerLeave,
      };

  let inlineContent: React.ReactNode;

  if (isUndiscoveredForParty) {
    inlineContent = (
      <span
        className={`wiki-link-node wiki-link-node--undiscovered${selected ? ' wiki-link-node--selected' : ''}`}
        title={attrs.label}
        contentEditable={false}
        {...sharedDataAttrs}
      >
        {attrs.label}
      </span>
    );
  } else if (!isEditing && resolved && attrs.targetPageId && campaignHandle) {
    inlineContent = (
      <Link
        to={campaignWikiPath(campaignHandle, attrs.targetPageId, flatPages)}
        className={`wiki-link-node wiki-link-node--readonly${narrativeStatusClass ? ` ${narrativeStatusClass}` : ''}${selected || touchSelected ? ' wiki-link-node--selected' : ''}`}
        title={accessibleTitle}
        contentEditable={false}
        onClick={handleReadLinkClick}
        onKeyDown={handleReadNavigate}
        {...sharedDataAttrs}
        {...hoverHandlers}
        {...touchHandlers}
      >
        {attrs.label}
      </Link>
    );
  } else if (!isEditing && !resolved) {
    inlineContent = (
      <span
        role="button"
        tabIndex={0}
        className={`wiki-link-node wiki-link-node--readonly-unresolved${selected ? ' wiki-link-node--selected' : ''}`}
        title={accessibleTitle}
        onClick={handleUnresolvedTap}
        {...sharedDataAttrs}
        {...hoverHandlers}
        {...touchHandlers}
      >
        {attrs.label}
      </span>
    );
  } else {
    inlineContent = (
      <span
        role={resolved ? undefined : 'button'}
        tabIndex={resolved ? undefined : 0}
        className={`wiki-link-node ${resolved ? 'wiki-link-node--resolved' : 'wiki-link-node--unresolved'}${narrativeStatusClass ? ` ${narrativeStatusClass}` : ''}${selected ? ' wiki-link-node--selected' : ''}`}
        title={accessibleTitle}
        onClick={handleUnresolvedTap}
        {...sharedDataAttrs}
        {...hoverHandlers}
        {...touchHandlers}
      >
        {inlineLabel}
      </span>
    );
  }

  return (
    <NodeViewWrapper as="span" className="inline relative">
      {inlineContent}

      {showMarginNote ? (
        <WikiLinkMarginNote
          typeLabel={
            presenceHidden && indexEntry?.presenceState
              ? `${typeLabel ?? 'Entry'} · ${indexEntry.presenceState === 'HIDDEN' ? 'Hidden' : 'Draft'}`
              : typeLabel
          }
          title={marginNoteTitle}
          summary={preview?.summary ?? null}
          inboundLinkCount={preview?.inboundLinkCount}
          wordCount={preview?.wordCount}
          narrativeStatusLabel={
            isManager && indexEntry?.narrativeStatus
              ? indexEntry.narrativeStatus.label
              : indexEntry?.narrativeStatus?.visibleToParty
                ? indexEntry.narrativeStatus.label
                : null
          }
        />
      ) : null}
      {previewLoading && showMarginNote ? (
        <span className="pointer-events-none absolute left-0 top-full z-50 mt-1 text-[10px] text-muted">
          …
        </span>
      ) : null}

      {actionSheetOpen && resolved && attrs.targetPageId && campaignHandle
        ? createPortal(
            <div
              className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-4 sm:items-center"
              onClick={() => setActionSheetOpen(false)}
            >
              <div
                className="w-full max-w-sm rounded-lg border border-border bg-background p-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm font-semibold text-foreground">{attrs.label}</p>
                <ul className="mt-3 space-y-2">
                  <li>
                    <button
                      type="button"
                      className="w-full rounded border border-border px-3 py-2 text-left text-sm hover:bg-muted/20"
                      onClick={() => {
                        navigate(campaignWikiPath(campaignHandle, attrs.targetPageId!, flatPages));
                        setActionSheetOpen(false);
                      }}
                    >
                      Open page
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="w-full text-left text-xs text-muted hover:text-foreground"
                      onClick={() => setActionSheetOpen(false)}
                    >
                      Cancel
                    </button>
                  </li>
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}

      {menuOpen && !resolved
        ? createPortal(
            <div
              className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-4 sm:items-center"
              onClick={() => {
                setMenuOpen(false);
                setStubSearch('');
              }}
            >
              <div
                className="w-full max-w-sm rounded-lg border border-border bg-background p-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h4 className="text-sm font-semibold text-foreground">
                  [[{attrs.label}]]
                </h4>
                <p className="mt-1 text-xs text-muted">No codex page linked yet.</p>
                <label className="mt-3 block text-xs text-muted">
                  Search existing pages
                  <input
                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                    value={stubSearch}
                    onChange={(e) => setStubSearch(e.target.value)}
                    autoFocus
                  />
                </label>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                  {stubMatches.map((s) => (
                    <li key={s.pageId}>
                      <button
                        type="button"
                        className="w-full rounded border border-border px-3 py-2 text-left text-sm hover:bg-muted/20"
                        onClick={() => linkToExisting(s.pageId, s.label)}
                      >
                        Link to {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
                {campaignHandle ? (
                  <Link
                    to={campaignWikiPath(campaignHandle)}
                    className="mt-3 block w-full rounded border border-dashed border-border px-3 py-2 text-center text-sm text-primary hover:bg-muted/20"
                    onClick={() => setMenuOpen(false)}
                  >
                    Create page in wiki tree
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="mt-2 w-full text-left text-xs text-muted hover:text-foreground"
                  onClick={markIgnored}
                >
                  Leave unresolved
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </NodeViewWrapper>
  );
}
