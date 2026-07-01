import { META_FIELD_LABEL_CLASS, META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useMemo, useState } from 'react';
import { CreatePageModal } from '@/components/CreatePageModal';
import { PageIdListEditor, codexFieldClass } from '@/components/entity/codexMetadataEditorShared';
import {
  ANCESTRY_PRESENCE_LABELS,
  POPULATION_PRESENCE_LABELS,
  POPULATION_PRESENCE_VALUES,
  parseAncestryMetadata,
  type AncestryMetadataFields,
  type PopulationPresence,
} from '@/lib/ancestryMetadata';
import { buildAncestryPresenceProjection } from '@/lib/ancestryPresenceProjection';
import { charactersOfAncestry } from '@/lib/charactersOfAncestry';
import { filterRegionLocationPages } from '@/lib/locationMetadata';
import { filterLocationPages } from '@/lib/questHubLayout';
import { updateAncestryMetadata } from '@/lib/wiki';
import { useWiki } from '@/contexts/WikiContext';
import { EntityRelationChip } from '@/components/entity/EntityRelationChip';
import type { WikiTreeNode } from '@/types/wiki';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';

interface AncestryPresenceTabProps {
  campaignHandle: string;
  pageId: string;
  flatPages: WikiTreeNode[];
  pageMetadata: unknown;
  isEditingPage: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
}

export function AncestryPresenceTab({
  campaignHandle,
  pageId,
  flatPages,
  pageMetadata,
  isEditingPage,
  onMetadataSaved,
}: AncestryPresenceTabProps) {
  const { refresh, campaign } = useWiki();
  const campaignNow = useCampaignChronologyNow(campaignHandle);
  const parsed = useMemo(() => parseAncestryMetadata(pageMetadata), [pageMetadata]);
  const characters = charactersOfAncestry(pageId, flatPages);
  const projection = buildAncestryPresenceProjection(pageId, flatPages, {
    campaignCharacterLocationIds: characters
      .map((c) => c.currentLocationId)
      .filter((id): id is string => Boolean(id)),
  });
  const locationPages = filterLocationPages(flatPages);
  const regionPages = useMemo(
    () => filterRegionLocationPages(locationPages),
    [locationPages],
  );
  const locationsRoot = useMemo(
    () => flatPages.find((page) => page.title === 'Locations' && page.parentId === null),
    [flatPages],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [homelandDraft, setHomelandDraft] = useState<string | null>(null);
  const [isCreateRegionOpen, setIsCreateRegionOpen] = useState(false);
  const [createRegionTitle, setCreateRegionTitle] = useState<string | null>(null);

  const snapshots = flatPages.map((p) => ({
    id: p.id,
    title: p.title,
    templateType: p.templateType,
    metadata: p.metadata ?? null,
  }));

  const persist = useCallback(
    async (patch: Partial<AncestryMetadataFields>) => {
      setSaving(true);
      setError(null);
      try {
        const result = await updateAncestryMetadata(campaignHandle, pageId, patch);
        onMetadataSaved(result.metadata);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save presence data');
      } finally {
        setSaving(false);
      }
    },
    [campaignHandle, onMetadataSaved, pageId],
  );

  const handleCreateRegion = useCallback((title: string) => {
    setCreateRegionTitle(title.trim());
    setIsCreateRegionOpen(true);
  }, []);

  const handleRegionPageCreated = useCallback(
    async (page: WikiTreeNode) => {
      setIsCreateRegionOpen(false);
      setCreateRegionTitle(null);
      await refresh();
      await persist({
        homelandRegionIds: [...parsed.homelandRegionIds, page.id],
      });
    },
    [parsed.homelandRegionIds, persist, refresh],
  );

  if (isEditingPage) {
    const homelandText = homelandDraft ?? parsed.homeland ?? '';

    return (
      <>
        <div className="space-y-4 rounded-lg border border-border/60 bg-surface/40 p-4">
          <label className="block space-y-1">
            <span className={META_FIELD_LABEL_CLASS}>
              Population distribution
            </span>
            <select
              className={codexFieldClass}
              value={parsed.populationPresence ?? ''}
              onChange={(e) => {
                const value = (e.target.value || null) as PopulationPresence | null;
                void persist({ populationPresence: value });
              }}
            >
              <option value="">—</option>
              {POPULATION_PRESENCE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {POPULATION_PRESENCE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          <PageIdListEditor
            label={ANCESTRY_PRESENCE_LABELS.homelands}
            ids={parsed.homelandRegionIds}
            pickerPages={regionPages.length > 0 ? regionPages : locationPages}
            defaultOptions={regionPages}
            searchOptions={locationPages}
            flatPages={flatPages}
            placeholder="Search homelands…"
            createLabel="Create new region"
            onCreatePage={locationsRoot ? handleCreateRegion : undefined}
            onChange={(next) => void persist({ homelandRegionIds: next })}
          />

          <label className="block space-y-1">
            <span className={META_FIELD_LABEL_CLASS}>
              Homeland notes
            </span>
            <input
              className={codexFieldClass}
              value={homelandText}
              placeholder="Optional freeform homeland…"
              onChange={(e) => setHomelandDraft(e.target.value)}
              onBlur={() => {
                const next = homelandText.trim() || null;
                setHomelandDraft(null);
                if (next === parsed.homeland) return;
                void persist({ homeland: next });
              }}
            />
            <p className="text-[10px] text-muted">
              Optional prose when no region page exists yet; structured links preferred for hub
              grouping.
            </p>
          </label>

          <PageIdListEditor
            label={ANCESTRY_PRESENCE_LABELS.communities}
            ids={parsed.communityRegionIds}
            pickerPages={locationPages}
            flatPages={flatPages}
            placeholder="Search communities…"
            onChange={(next) => void persist({ communityRegionIds: next })}
          />

          <PageIdListEditor
            label={ANCESTRY_PRESENCE_LABELS.diaspora}
            ids={parsed.diasporaRegionIds}
            pickerPages={locationPages}
            flatPages={flatPages}
            placeholder="Search diaspora locations…"
            onChange={(next) => void persist({ diasporaRegionIds: next })}
          />

          {saving ? <p className="text-xs text-muted">Saving…</p> : null}
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        {locationsRoot ? (
          <CreatePageModal
            open={isCreateRegionOpen}
            campaignHandle={campaignHandle}
            parentId={locationsRoot.id}
            categoryTitle="Locations"
            flatPages={flatPages}
            initialTitle={createRegionTitle}
            initialMetadata={{ Type: 'Region' }}
            onClose={() => {
              setIsCreateRegionOpen(false);
              setCreateRegionTitle(null);
            }}
            onCreated={(page) => void handleRegionPageCreated(page)}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {projection.populationPresenceLabel ? (
        <p className="text-sm text-foreground/90">{projection.populationPresenceLabel}</p>
      ) : null}

      {projection.sections.length > 0 ? (
        projection.sections.map((section) => (
          <section
            key={section.label}
            className="rounded-lg border border-border/60 bg-surface/40 p-4"
          >
            <h3 className={`mb-2 ${META_SECTION_LABEL_CLASS}`}>
              {section.label}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {section.locations.map((loc) => (
                <li key={loc.pageId}>
                  <EntityRelationChip
                    campaignHandle={campaignHandle}
                    pageId={loc.pageId}
                    title={loc.title}
                    templateType={
                      snapshots.find((s) => s.id === loc.pageId)?.templateType ?? 'DEFAULT'
                    }
                    flatPages={snapshots}
                    previewContext={{ campaignNow, isDMUser: true, viewerPageId: pageId }}
                    compact
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : projection.legacyHomeland || projection.legacyRegion ? (
        <section className="rounded-lg border border-border/60 bg-surface/40 p-4">
          <h3 className={`mb-2 ${META_SECTION_LABEL_CLASS}`}>
            Legacy notes
          </h3>
          <p className="text-sm">
            {projection.legacyHomeland ?? projection.legacyRegion}
          </p>
        </section>
      ) : (
        <p className="text-sm text-muted">No presence locations recorded yet.</p>
      )}

      {projection.campaignInferred.length > 0 ? (
        <section className="rounded-lg border border-border/60 bg-surface/40 p-4">
          <h3 className={`mb-2 ${META_SECTION_LABEL_CLASS}`}>
            Inferred from characters
          </h3>
          <ul className="flex flex-wrap gap-2">
            {projection.campaignInferred.map((loc) => (
              <li key={loc.pageId}>
                <EntityRelationChip
                  campaignHandle={campaignHandle}
                  pageId={loc.pageId}
                  title={loc.title}
                  templateType={
                    snapshots.find((s) => s.id === loc.pageId)?.templateType ?? 'DEFAULT'
                  }
                  flatPages={snapshots}
                  previewContext={{ campaignNow, isDMUser: true, viewerPageId: pageId }}
                  compact
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
