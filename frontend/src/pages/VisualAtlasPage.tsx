import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Images } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import {
  campaignDashboardPath,
  campaignPartyPath,
  campaignPath,
  campaignWikiPath,
} from '@/lib/campaignPaths';
import {
  fetchVisualAtlas,
  filterVisualAtlasItems,
  VISUAL_ATLAS_FILTERS,
  VISUAL_ATLAS_SOURCE_LABELS,
  type VisualAtlasFilterSelection,
  type VisualAtlasItem,
  type VisualAtlasPayload,
} from '@/lib/visualAtlas';
import { ImageCreditDisplay } from '@/components/media/ImageCreditDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { hasImageCredit, IMAGE_CREDIT_DISCLAIMER } from '@shared/imageCredit';

export function VisualAtlasPage() {
  const { campaignHandle, flatPages } = useWiki();
  const [payload, setPayload] = useState<VisualAtlasPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<VisualAtlasFilterSelection>('all');

  const reload = useCallback(async () => {
    if (!campaignHandle) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchVisualAtlas(campaignHandle);
      setPayload(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Visual Atlas');
    } finally {
      setLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filteredItems = useMemo(
    () => filterVisualAtlasItems(payload?.items ?? [], filter),
    [payload?.items, filter],
  );

  const showCampaignBanners = filter === 'all' && (payload?.campaignBanners.length ?? 0) > 0;

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Images className="size-6 text-primary" aria-hidden />
          <h1 className="text-2xl font-semibold text-foreground">Visual Atlas</h1>
        </div>
        <p className="max-w-2xl text-sm text-muted">
          A read-only view of portraits, artwork, maps, and handout covers from your
          lore pages. Images are owned by their source pages — edit them there. Optional
          credits thank artists and tools when you can.
        </p>
        <p className="max-w-2xl text-xs text-muted">{IMAGE_CREDIT_DISCLAIMER}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {VISUAL_ATLAS_FILTERS.map((chip) => {
          const active = filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilter(chip.id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface/60 text-muted hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {loading ? <LoadingSpinner label="Loading Visual Atlas…" /> : null}

      {error ? (
        <p className="rounded border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {!loading && !error && payload ? (
        <>
          {showCampaignBanners ? (
            <section className="space-y-3">
              <h2 className={META_SECTION_LABEL_CLASS}>
                Campaign imagery
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {payload.campaignBanners.map((banner) => (
                  <Link
                    key={banner.id}
                    to={
                      banner.linkTarget === 'dashboard'
                        ? campaignDashboardPath(campaignHandle)
                        : campaignPartyPath(campaignHandle)
                    }
                    className="group overflow-hidden rounded-xl border border-border bg-surface/60"
                  >
                    <div className="aspect-[21/9] overflow-hidden bg-[#1a1a1a]">
                      <img
                        src={banner.imageUrl}
                        alt={banner.label}
                        className="size-full object-cover transition-transform group-hover:scale-[1.02]"
                      />
                    </div>
                    <div className="border-t border-border px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{banner.label}</p>
                      <p className="text-xs text-muted">Campaign banner</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center">
              <p className="text-sm text-muted">
                {filter === 'all'
                  ? 'Visual Atlas collects images from your lore pages. Add portraits, artwork blocks, or maps to entity pages to see them here.'
                  : 'No images match this filter yet.'}
              </p>
            </div>
          ) : (
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredItems.map((item) => (
                <VisualAtlasTile
                  key={item.id}
                  item={item}
                  campaignHandle={campaignHandle}
                  flatPages={flatPages}
                />
              ))}
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}

function VisualAtlasTile({
  item,
  campaignHandle,
  flatPages,
}: {
  item: VisualAtlasItem;
  campaignHandle: string;
  flatPages: ReturnType<typeof useWiki>['flatPages'];
}) {
  const imageSrc = item.thumbUrl ?? item.imageUrl;
  const target =
    item.sourceKind === 'map' && item.assetId
      ? campaignPath(campaignHandle, 'maps', item.assetId)
      : campaignWikiPath(campaignHandle, item.pageId, flatPages);

  return (
    <Link
      to={target}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface/60 transition-colors hover:border-primary/40"
    >
      <div className="aspect-[4/5] overflow-hidden bg-[#1a1a1a]">
        <img
          src={imageSrc}
          alt={item.pageTitle}
          className="size-full object-cover transition-transform group-hover:scale-[1.02]"
          loading="lazy"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="truncate text-sm font-medium text-foreground" title={item.pageTitle}>
          {item.pageTitle}
        </p>
        <p className="text-xs text-muted">
          {VISUAL_ATLAS_SOURCE_LABELS[item.sourceKind]}
          {item.caption ? ` · ${item.caption}` : ''}
        </p>
        {hasImageCredit(item.imageCredit) ? (
          <ImageCreditDisplay credit={item.imageCredit} className="mt-1" />
        ) : null}
      </div>
    </Link>
  );
}
