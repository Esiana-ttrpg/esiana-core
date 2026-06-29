import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hash, FileText } from 'lucide-react';
import { fetchTagsHub } from '@/lib/wiki';
import { campaignWikiPath } from '@/lib/campaignPaths';
import type { TagsHubPageEntry, WikiTag, WikiTagWithCount } from '@/types/wiki';
import type { WikiBreadcrumb } from '@/lib/wikiHierarchy';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { TagChip } from '@/components/wiki/TagChip';
import { TagAppearanceEditor } from '@/components/wiki/TagAppearanceEditor';
import { useWiki } from '@/contexts/WikiContext';
import { CategoryHubShell } from '@/components/wiki/indexBrowse/CategoryHubShell';
import { CategoryIndexToolbar } from '@/components/wiki/indexBrowse/CategoryIndexToolbar';
import { CategoryIndexRefinePopover } from '@/components/wiki/indexBrowse/CategoryIndexRefinePopover';
import { WikiPageBreadcrumbs } from '@/components/wiki/WikiPageBreadcrumbs';
import { formatWorkspaceHubCountHint } from '@/lib/workspaceHeaderPolicy';

interface TagsHubViewProps {
  campaignHandle: string;
  initialTagId?: string;
}

function filterTags(tags: WikiTagWithCount[], query: string): WikiTagWithCount[] {
  const q = query.trim().toLowerCase();
  if (!q) return tags;
  return tags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(q) || tag.label.toLowerCase().includes(q),
  );
}

function filterPages(pages: TagsHubPageEntry[], query: string): TagsHubPageEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return pages;
  return pages.filter(
    (page) =>
      page.title.toLowerCase().includes(q) ||
      (page.snippet ?? '').toLowerCase().includes(q),
  );
}

export function TagsHubView({ campaignHandle, initialTagId }: TagsHubViewProps) {
  const { campaign, flatPages } = useWiki();
  const canManage =
    campaign?.role === 'GAMEMASTER' || campaign?.role === 'WRITER';

  const [tags, setTags] = useState<WikiTagWithCount[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [pages, setPages] = useState<TagsHubPageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadHub = useCallback(
    async (tagId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTagsHub(campaignHandle, tagId);
        setTags(data.tags ?? []);
        setSelectedTagId(data.selectedTagId);
        setPages(data.pages ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tags');
        setTags([]);
        setPages([]);
        setSelectedTagId(null);
      } finally {
        setLoading(false);
      }
    },
    [campaignHandle],
  );

  useEffect(() => {
    void loadHub(initialTagId);
  }, [loadHub, initialTagId]);

  function handleSelectTag(tagId: string) {
    setSelectedTagId(tagId);
    setSearchQuery('');
    void loadHub(tagId);
  }

  function handleTagUpdated(updated: WikiTag) {
    setTags((prev) =>
      prev.map((tag) =>
        tag.id === updated.id
          ? { ...tag, ...updated, pageCount: tag.pageCount }
          : tag,
      ),
    );
  }

  const selectedTag = tags.find((tag) => tag.id === selectedTagId);
  const filteredTags = useMemo(
    () => filterTags(tags, searchQuery),
    [tags, searchQuery],
  );
  const filteredPages = useMemo(
    () => filterPages(pages, searchQuery),
    [pages, searchQuery],
  );

  const breadcrumbCrumbs = useMemo((): WikiBreadcrumb[] => {
    if (!selectedTag) {
      return [{ id: 'tags', title: 'Tags' }];
    }
    return [
      { id: 'tags', title: 'Tags' },
      { id: selectedTag.id, title: selectedTag.label },
    ];
  }, [selectedTag]);

  const resultCountLabel = formatWorkspaceHubCountHint({
    total: selectedTagId ? pages.length : tags.length,
    matching: selectedTagId ? filteredPages.length : filteredTags.length,
    singular: selectedTagId ? 'page' : 'tag',
    plural: selectedTagId ? 'pages' : 'tags',
    searchQuery,
    hasActiveRefine: searchQuery.trim().length > 0,
  });

  if (loading && tags.length === 0) {
    return <LoadingSpinner label="Loading tags…" />;
  }

  return (
    <CategoryHubShell
      breadcrumbCrumbs={breadcrumbCrumbs}
      breadcrumbs={
        <WikiPageBreadcrumbs crumbs={breadcrumbCrumbs} campaignHandle={campaignHandle} />
      }
      title={
        <>
          <Hash className="size-6 text-primary" strokeWidth={1.25} />
          Tags
        </>
      }
      actions={
        <CategoryIndexToolbar
          createLabel="Create tag"
          onCreate={() => {}}
          createAction={null}
          resultCountLabel={resultCountLabel}
          refineControl={
            <CategoryIndexRefinePopover
              facetDefs={[]}
              refineState={{}}
              children={[]}
              categoryTitle="Tags"
              onRefineChange={() => {}}
              customBody={<div />}
              activeCount={searchQuery.trim() ? 1 : undefined}
              onResetRefine={() => setSearchQuery('')}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={
                selectedTagId ? 'Filter tagged pages…' : 'Filter tags…'
              }
            />
          }
        />
      }
    >
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <section>
        {tags.length === 0 ? (
          <p className="text-sm text-muted">
            No tags yet. Assign tags from any wiki page using the wrench menu.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(selectedTagId ? tags : filteredTags).map((tag) => (
              <TagChip
                key={tag.id}
                name={tag.name}
                label={tag.label}
                icon={tag.icon}
                iconAssetUrl={tag.iconAssetUrl}
                color={tag.color}
                count={tag.pageCount}
                selected={tag.id === selectedTagId}
                onClick={() => handleSelectTag(tag.id)}
              />
            ))}
          </div>
        )}
      </section>

      {canManage && selectedTag ? (
        <TagAppearanceEditor
          campaignHandle={campaignHandle}
          tag={selectedTag}
          onUpdated={handleTagUpdated}
        />
      ) : null}

      <section>
        {loading ? (
          <LoadingSpinner label="Loading pages…" />
        ) : !selectedTagId ? (
          <EmptyState
            icon={Hash}
            title="Select a tag"
            description="Choose a tag above to browse connected wiki pages."
          />
        ) : filteredPages.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={searchQuery.trim() ? 'No pages match' : 'No pages'}
            description={
              searchQuery.trim()
                ? 'Try a different filter or clear refine.'
                : 'No wiki pages are assigned this tag yet.'
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPages.map((page) => (
              <li key={page.id}>
                <Link
                  to={campaignWikiPath(campaignHandle, page.id, flatPages)}
                  className="region-depth-3 block rounded-md p-4 transition-colors hover:bg-focal-elevated"
                >
                  <h3 className="font-medium text-focal-foreground">{page.title}</h3>
                  {page.snippet ? (
                    <p className="mt-1.5 line-clamp-3 text-sm text-muted">
                      {page.snippet}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-sm italic text-muted">
                      No description yet.
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </CategoryHubShell>
  );
}
