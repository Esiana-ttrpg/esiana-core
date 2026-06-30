import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  buildWikiBreadcrumbs,
  formatParentOptionLabel,
  isExcludedParentCandidate,
  updateWikiPage,
} from '@/lib/wiki';
import { WikiPageTagsInput } from '@/components/wiki/WikiPageTagsInput';
import { WikiPageAliasesEditor } from '@/components/wiki/WikiPageAliasesEditor';
import { useWiki } from '@/contexts/WikiContext';
import type { WikiPageParentRef, WikiTag, WikiTagInput, WikiTreeNode } from '@/types/wiki';

const fieldSelectClass =
  'w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary/60 disabled:opacity-60';

interface DocumentSectionEditorProps {
  campaignHandle: string;
  pageId: string;
  parentId: string | null;
  parentChain?: WikiPageParentRef | null;
  flatPages: WikiTreeNode[];
  templateType: string;
  onTemplateTypeChange: (templateType: string) => void;
  pageVisibility: string;
  onVisibilityChange: (visibility: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
  onParentChange: (next: {
    parentId: string | null;
    parent?: WikiPageParentRef | null;
  }) => void;
  onTreeRefresh: () => Promise<void>;
  pageTags: WikiTagInput[];
  allCampaignTags: WikiTag[];
  onPageTagsChange: (tags: WikiTagInput[]) => void;
  showTags?: boolean;
  showTemplate?: boolean;
  tagsSaveHint?: string;
}

export function DocumentSectionEditor({
  campaignHandle,
  pageId,
  parentId,
  parentChain,
  flatPages,
  templateType,
  onTemplateTypeChange,
  pageVisibility,
  onVisibilityChange,
  onParentChange,
  onTreeRefresh,
  pageTags,
  allCampaignTags,
  onPageTagsChange,
  showTags = true,
  showTemplate = true,
  tagsSaveHint = 'Changes save when you close the inspector.',
}: DocumentSectionEditorProps) {
  const { canManageWiki } = useWiki();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [savingParent, setSavingParent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const eligiblePages = useMemo(
    () =>
      flatPages
        .filter((page) => !isExcludedParentCandidate(page, pageId, flatPages))
        .sort((a, b) =>
          formatParentOptionLabel(a, flatPages).localeCompare(
            formatParentOptionLabel(b, flatPages),
            undefined,
            { sensitivity: 'base' },
          ),
        ),
    [flatPages, pageId],
  );

  const filteredOptions = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return eligiblePages;
    return eligiblePages.filter((page) => {
      const label = formatParentOptionLabel(page, flatPages).toLowerCase();
      const title = page.title.toLowerCase();
      return label.includes(needle) || title.includes(needle);
    });
  }, [eligiblePages, flatPages, searchQuery]);

  const selectedPage = useMemo(
    () => (parentId ? flatPages.find((p) => p.id === parentId) : null),
    [flatPages, parentId],
  );

  const selectedLabel = useMemo(() => {
    if (!parentId) return 'None (top level)';
    if (selectedPage) {
      return formatParentOptionLabel(selectedPage, flatPages).trim();
    }
    if (parentChain) {
      const crumbs = buildWikiBreadcrumbs(parentChain);
      if (crumbs.length === 0) return 'Unknown parent';
      return crumbs.map((crumb) => crumb.title).join(' › ');
    }
    return 'Unknown parent';
  }, [flatPages, parentChain, parentId, selectedPage]);

  const inputValue = isOpen ? searchQuery : selectedLabel;

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!containerRef.current || !target) return;
      if (!containerRef.current.contains(target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  async function handleSelect(nextParentId: string | null) {
    if (nextParentId === parentId) {
      setIsOpen(false);
      setSearchQuery('');
      inputRef.current?.blur();
      return;
    }

    setSavingParent(true);
    setError(null);
    try {
      const updated = await updateWikiPage(campaignHandle, pageId, {
        parentId: nextParentId,
      });
      onParentChange({
        parentId: updated.parentId,
        parent: updated.parent ?? null,
      });
      await onTreeRefresh();
      setIsOpen(false);
      setSearchQuery('');
      inputRef.current?.blur();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to update parent page',
      );
    } finally {
      setSavingParent(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="wiki-parent-picker"
          className={META_FIELD_LABEL_CLASS}
        >
          Belongs within
        </label>
        <div ref={containerRef} className="relative">
          <div className="relative">
            <input
              ref={inputRef}
              id="wiki-parent-picker"
              type="search"
              value={inputValue}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => {
                setIsOpen(true);
                setSearchQuery('');
              }}
              disabled={savingParent}
              placeholder="Search pages…"
              autoComplete="off"
              role="combobox"
              aria-expanded={isOpen}
              className={`${fieldSelectClass} pr-8 text-xs`}
            />
            {savingParent && (
              <Loader2
                className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted"
                aria-hidden
              />
            )}
          </div>
          {isOpen && (
            <ul
              className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-background p-1 shadow-xl"
              role="listbox"
            >
              <li>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void handleSelect(null)}
                  className={`block w-full rounded px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-surface ${
                    parentId === null ? 'bg-primary/10 text-primary' : 'text-foreground'
                  }`}
                >
                  None (top level)
                </button>
              </li>
              {filteredOptions.map((page) => (
                <li key={page.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void handleSelect(page.id)}
                    className={`block w-full rounded px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-surface ${
                      parentId === page.id ? 'bg-primary/10 text-primary' : 'text-foreground'
                    }`}
                  >
                    {formatParentOptionLabel(page, flatPages).trim()}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-3">
        {showTemplate ? (
          <label className="space-y-1">
            <span className={META_FIELD_LABEL_CLASS}>
              Entity type
            </span>
            <select
              id="wiki-template-type"
              value={templateType}
              onChange={(event) => onTemplateTypeChange(event.target.value)}
              className={`${fieldSelectClass} text-xs`}
            >
              <option value="DEFAULT">Default</option>
              <option value="CHARACTER">Character</option>
              <option value="LOCATION">Location</option>
              <option value="ORGANIZATION">Organization</option>
              <option value="FAMILY">Family</option>
            </select>
          </label>
        ) : null}

        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Visibility
          </span>
          <select
            value={pageVisibility}
            onChange={(event) =>
              void onVisibilityChange(
                event.target.value as 'Public' | 'Party' | 'DM_Only',
              )
            }
            className={`${fieldSelectClass} text-xs`}
          >
            <option value="Public">Public</option>
            <option value="Party">Party-Visible</option>
            <option value="DM_Only">DM/Co-DM Only</option>
          </select>
        </label>
      </div>

      {canManageWiki ? (
        <div className="space-y-1.5">
          <span className={META_FIELD_LABEL_CLASS}>
            Codex aliases
          </span>
          <WikiPageAliasesEditor
            campaignHandle={campaignHandle}
            pageId={pageId}
            pageTitle={flatPages.find((p) => p.id === pageId)?.title ?? 'Page'}
          />
        </div>
      ) : null}

      {showTags ? (
        <div className="space-y-1.5">
          <span className={META_FIELD_LABEL_CLASS}>
            Tags
          </span>
          <WikiPageTagsInput
            assignedTags={pageTags}
            allCampaignTags={allCampaignTags}
            onChange={onPageTagsChange}
            disabled={savingParent}
          />
          <p className="text-[10px] text-muted">{tagsSaveHint}</p>
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
