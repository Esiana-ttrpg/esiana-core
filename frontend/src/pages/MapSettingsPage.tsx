import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Map, Trash2 } from 'lucide-react';
import {
  deleteCampaignMap,
  fetchCampaignMap,
  filterLocationWikiPages,
  linkMapToWikiPage,
  mapAssetImageUrl,
  resolveMapsHubPath,
  updateCampaignMap,
  updateCampaignMapDisplayName,
} from '@/lib/maps';
import { campaignPath, campaignWikiPath, readCampaignHandle } from '@/lib/campaignPaths';
import { fetchCampaign } from '@/lib/campaigns';
import { CampaignMemberRoles } from '@/types/domain';
import { useWiki } from '@/contexts/WikiContext';
import { mapDisplayTitle } from '@/types/maps';
import type { CampaignMapDetail } from '@/types/maps';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import { MapDeleteDialog } from '@/components/maps/MapDeleteDialog';
import { ImageCreditEditor } from '@/components/media/ImageCreditEditor';
import type { ImageCredit } from '@shared/imageCredit';

export function MapSettingsPage() {
  const params = useParams<{ campaignHandle: string; assetId: string }>();
  const campaignHandle = readCampaignHandle(params);
  const assetId = params.assetId ?? '';
  const navigate = useNavigate();
  const { flatPages } = useWiki();

  const [detail, setDetail] = useState<CampaignMapDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [visibility, setVisibility] = useState('Public');
  const [savingName, setSavingName] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [savingCredit, setSavingCredit] = useState(false);
  const [imageCreditDraft, setImageCreditDraft] = useState<ImageCredit | null>(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const mapsHubPath = resolveMapsHubPath(campaignHandle);

  const locationPages = useMemo(
    () => filterLocationWikiPages(flatPages),
    [flatPages],
  );

  const filteredLocations = useMemo(() => {
    const q = locationSearch.trim().toLowerCase();
    if (!q) return locationPages.slice(0, 30);
    return locationPages
      .filter((page) => page.title.toLowerCase().includes(q))
      .slice(0, 30);
  }, [locationPages, locationSearch]);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mapDetail, campaign] = await Promise.all([
        fetchCampaignMap(campaignHandle, assetId),
        fetchCampaign(campaignHandle),
      ]);
      setDetail(mapDetail);
      setDisplayName(mapDetail.map.displayName ?? '');
      setVisibility(mapDetail.map.visibility ?? 'Public');
      setCanManage(
        campaign.role === CampaignMemberRoles.GAMEMASTER ||
          campaign.role === CampaignMemberRoles.WRITER,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load map settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [campaignHandle, assetId]);

  useEffect(() => {
    setImageCreditDraft(detail?.map.imageCredit ?? null);
  }, [detail?.map.imageCredit]);

  const saveDisplayName = async () => {
    setSavingName(true);
    setError(null);
    try {
      const updated = await updateCampaignMapDisplayName(
        campaignHandle,
        assetId,
        displayName.trim() || null,
      );
      setDetail((current) =>
        current ? { ...current, map: { ...current.map, ...updated } } : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save map name');
    } finally {
      setSavingName(false);
    }
  };

  const saveImageCredit = async (imageCredit: ImageCredit | null) => {
    setSavingCredit(true);
    setError(null);
    try {
      const updated = await updateCampaignMap(campaignHandle, assetId, { imageCredit });
      setDetail((current) =>
        current ? { ...current, map: { ...current.map, ...updated } } : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save image credit');
    } finally {
      setSavingCredit(false);
    }
  };

  const saveVisibility = async (nextVisibility: string) => {
    setSavingVisibility(true);
    setError(null);
    try {
      const updated = await updateCampaignMap(campaignHandle, assetId, {
        visibility: nextVisibility,
      });
      setVisibility(updated.visibility);
      setDetail((current) =>
        current ? { ...current, map: { ...current.map, ...updated } } : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save visibility');
    } finally {
      setSavingVisibility(false);
    }
  };

  const saveLink = async (pageId: string | null) => {
    setSavingLink(true);
    setError(null);
    try {
      await linkMapToWikiPage(campaignHandle, assetId, pageId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save link');
    } finally {
      setSavingLink(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <MascotErrorPanel
        code={404}
        title="Map unavailable"
        description={error}
      />
    );
  }

  if (!detail) return null;

  const title = mapDisplayTitle(detail.map);
  const linkedPage = detail.map.linkedPage ?? detail.linkedWikiPages[0] ?? null;
  const nestedChildren = detail.map.nestedChildMaps ?? [];

  if (!canManage) {
    return (
      <EmptyState
        icon={Map}
        title="Settings restricted"
        description="Only DM and Co-DM can manage map settings."
      />
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={mapsHubPath}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Maps
        </Link>
        <span className="text-muted">·</span>
        <Link
          to={campaignPath(campaignHandle, 'maps', assetId)}
          className="text-sm text-muted hover:text-foreground"
        >
          Open viewer
        </Link>
      </div>

      <header>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted">Map settings</p>
      </header>

      {error ? (
        <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <section className="rounded-xl border border-border bg-surface/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Map name
        </h2>
        <p className="mt-1 text-sm text-muted">
          Shown on the Maps hub and viewer. If empty, the linked Location title is used.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={linkedPage?.title ?? 'Untitled map'}
            className="min-w-[12rem] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={savingName}
            className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground disabled:opacity-50"
            onClick={() => void saveDisplayName()}
          >
            {savingName ? 'Saving…' : 'Save name'}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Map visibility
        </h2>
        <p className="mt-1 text-sm text-muted">
          Controls who can open this map from the Maps hub, viewer, and nested pins.
          DM/Co-DM always see all maps.
        </p>
        <select
          value={visibility}
          disabled={savingVisibility}
          onChange={(event) => {
            const next = event.target.value;
            setVisibility(next);
            void saveVisibility(next);
          }}
          className="mt-3 w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
          aria-label="Map visibility"
        >
          <option value="Public">Public — visible to everyone</option>
          <option value="Party">Party — campaign members and players</option>
          <option value="DM_Only">Hidden — DM/Co-DM only</option>
        </select>
      </section>

      <section className="rounded-xl border border-border bg-surface/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Image credit
        </h2>
        <ImageCreditEditor
          value={imageCreditDraft}
          onChange={setImageCreditDraft}
          disabled={savingCredit}
        />
        <button
          type="button"
          disabled={savingCredit}
          className="mt-3 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground disabled:opacity-50"
          onClick={() => void saveImageCredit(imageCreditDraft)}
        >
          {savingCredit ? 'Saving…' : 'Save credit'}
        </button>
      </section>

      <section className="rounded-xl border border-border bg-surface/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Preview
        </h2>
        <div className="mt-3 flex gap-4">
          <img
            src={mapAssetImageUrl(detail.map.id, 'thumb')}
            alt=""
            className="size-24 rounded-md border border-border object-cover"
          />
          <div className="text-sm text-muted">
            <div>{detail.map.width ?? '?'} × {detail.map.height ?? '?'} px</div>
            <div>{detail.map.pinCount ?? 0} pins</div>
            {nestedChildren.length > 0 ? (
              <div>{nestedChildren.length} nested map{nestedChildren.length === 1 ? '' : 's'}</div>
            ) : null}
            <div>
              Uploaded{' '}
              {new Date(detail.map.createdAt).toLocaleDateString(undefined, {
                dateStyle: 'medium',
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Linked location
        </h2>
        <p className="mt-1 text-sm text-muted">
          Embeds this interactive map on the chosen Location wiki page.
        </p>
        {linkedPage ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span>
              Linked to{' '}
              <Link
                to={campaignWikiPath(campaignHandle, linkedPage.id, flatPages)}
                className="font-medium text-primary hover:underline"
              >
                {linkedPage.title}
              </Link>
            </span>
            <button
              type="button"
              className="text-muted hover:underline"
              disabled={savingLink}
              onClick={() => void saveLink(null)}
            >
              Clear link
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">No location linked yet.</p>
        )}
        <input
          value={locationSearch}
          onChange={(event) => setLocationSearch(event.target.value)}
          placeholder="Search locations…"
          className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <ul className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border">
          {filteredLocations.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                disabled={savingLink}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/10 disabled:opacity-50"
                onClick={() => void saveLink(page.id)}
              >
                {page.title}
              </button>
            </li>
          ))}
          {filteredLocations.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">No locations found</li>
          ) : null}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-surface/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Nested maps
        </h2>
        <p className="mt-1 text-sm text-muted">
          Use nested maps for detail layers — e.g. a nation map with city maps behind pins.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>Upload each detail map (city, dungeon, etc.) from the Maps hub.</li>
          <li>
            Open the <strong>parent</strong> map in the viewer, turn on{' '}
            <strong>Edit pins</strong>, and double-click where the child map belongs.
          </li>
          <li>
            Choose <strong>Open nested map</strong> and pick the child map. Players click the pin
            to drill down; breadcrumbs show the path back.
          </li>
        </ol>
        {nestedChildren.length > 0 ? (
          <div className="mt-4">
            <div className="text-sm font-medium text-foreground">
              Maps behind this layer
            </div>
            <ul className="mt-2 space-y-2">
              {nestedChildren.map((entry) => (
                <li key={entry.assetId}>
                  <Link
                    to={campaignPath(campaignHandle, 'maps', entry.assetId)}
                    className="text-sm text-primary hover:underline"
                  >
                    {entry.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            No nested maps linked yet. Add pins from the viewer to connect child maps.
          </p>
        )}
      </section>

      {(detail.map.nestedInMaps?.length ?? 0) > 0 ? (
        <section className="rounded-xl border border-border bg-surface/50 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Nested in
          </h2>
          <p className="mt-1 text-sm text-muted">
            Parent maps that link to this map via pins.
          </p>
          <ul className="mt-2 space-y-2">
            {detail.map.nestedInMaps!.map((entry) => (
              <li key={entry.assetId}>
                <Link
                  to={campaignPath(campaignHandle, 'maps', entry.assetId)}
                  className="text-sm text-primary hover:underline"
                >
                  {entry.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-surface/50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Pins
        </h2>
        <p className="mt-1 text-sm text-muted">
          {detail.map.pinCount ?? 0} pins on this map.
        </p>
        <Link
          to={campaignPath(campaignHandle, 'maps', assetId)}
          className="mt-3 inline-block text-sm text-primary hover:underline"
        >
          Open viewer to edit pins
        </Link>
      </section>

      <section className="rounded-xl border border-red-900/40 bg-red-950/20 p-4">
        <h2 className="text-sm font-semibold text-red-300">Danger zone</h2>
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-900/50 px-3 py-2 text-sm text-red-400 hover:bg-red-950/40"
          onClick={() => setShowDelete(true)}
        >
          <Trash2 className="size-4" />
          Delete map
        </button>
      </section>

      <MapDeleteDialog
        open={showDelete}
        mapTitle={title}
        onClose={() => setShowDelete(false)}
        onConfirm={async () => {
          await deleteCampaignMap(campaignHandle, assetId);
          navigate(mapsHubPath, { replace: true });
        }}
      />
    </div>
  );
}
