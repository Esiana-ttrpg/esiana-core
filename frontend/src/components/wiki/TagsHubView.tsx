import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hash, FileText } from 'lucide-react';
import { fetchTagsHub } from '@/lib/wiki';
import { campaignWikiPath } from '@/lib/campaignPaths';
import type { TagsHubPageEntry, WikiTag, WikiTagWithCount } from '@/types/wiki';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { TagChip } from '@/components/wiki/TagChip';
import { TagAppearanceEditor } from '@/components/wiki/TagAppearanceEditor';
import { useWiki } from '@/contexts/WikiContext';

interface TagsHubViewProps {
  campaignHandle: string;
  initialTagId?: string;
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

  if (loading && tags.length === 0) {
    return <LoadingSpinner label="Loading tags…" />;
  }

  const selectedTag = tags.find((tag) => tag.id === selectedTagId);

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
          <Hash className="size-4" aria-hidden />
          Tag cloud
        </h2>
        {tags.length === 0 ? (
          <p className="text-sm text-muted">
            No tags yet. Assign tags from any wiki page using the wrench menu.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
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

      {canManage && selectedTag && (
        <TagAppearanceEditor
          campaignHandle={campaignHandle}
          tag={selectedTag}
          onUpdated={handleTagUpdated}
        />
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          {selectedTag
            ? `Pages tagged “${selectedTag.label}”`
            : 'Tagged pages'}
        </h2>

        {loading ? (
          <LoadingSpinner label="Loading pages…" />
        ) : !selectedTagId ? (
          <EmptyState
            icon={Hash}
            title="Select a tag"
            description="Choose a tag above to browse connected wiki pages."
          />
        ) : pages.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No pages"
            description="No wiki pages are assigned this tag yet."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
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
    </div>
  );
}
