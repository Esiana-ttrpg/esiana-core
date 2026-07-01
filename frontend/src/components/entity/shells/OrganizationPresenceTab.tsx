import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useMemo, useState } from 'react';
import { PageIdListEditor, codexFieldClass } from '@/components/entity/codexMetadataEditorShared';
import {
  INFLUENCE_MODES,
  INFLUENCE_MODE_LABELS,
  ORGANIZATIONAL_VISIBILITIES,
  ORGANIZATIONAL_VISIBILITY_LABELS,
  parseOrganizationMetadata,
  type OrganizationMetadataFields,
} from '@/lib/organizationMetadata';
import { buildOrganizationPresenceProjection } from '@/lib/organizationPresenceProjection';
import { filterLocationPages } from '@/lib/questHubLayout';
import { updateOrganizationMetadata } from '@/lib/wiki';
import { EntityRelationChip } from '@/components/entity/EntityRelationChip';
import type { WikiTreeNode } from '@/types/wiki';

interface OrganizationPresenceTabProps {
  campaignHandle: string;
  pageId: string;
  flatPages: WikiTreeNode[];
  pageMetadata: unknown;
  isEditingPage: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
}

export function OrganizationPresenceTab({
  campaignHandle,
  pageId,
  flatPages,
  pageMetadata,
  isEditingPage,
  onMetadataSaved,
}: OrganizationPresenceTabProps) {
  const parsed = useMemo(() => parseOrganizationMetadata(pageMetadata), [pageMetadata]);
  const snapshots = flatPages.map((p) => ({
    id: p.id,
    title: p.title,
    templateType: p.templateType,
    metadata: p.metadata ?? null,
  }));
  const projection = buildOrganizationPresenceProjection(pageId, snapshots, {
    includeChildRollup: true,
  });
  const locationPages = filterLocationPages(flatPages);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(
    async (patch: Partial<OrganizationMetadataFields>) => {
      setSaving(true);
      setError(null);
      try {
        const result = await updateOrganizationMetadata(campaignHandle, pageId, patch);
        onMetadataSaved(result.metadata);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save presence data');
      } finally {
        setSaving(false);
      }
    },
    [campaignHandle, onMetadataSaved, pageId],
  );

  if (isEditingPage) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted">Influence mode</span>
            <select
              className={codexFieldClass}
              value={parsed.influenceMode ?? ''}
              onChange={(e) =>
                void persist({
                  influenceMode: e.target.value
                    ? (e.target.value as OrganizationMetadataFields['influenceMode'])
                    : null,
                })
              }
              disabled={saving}
            >
              <option value="">—</option>
              {INFLUENCE_MODES.map((m) => (
                <option key={m} value={m}>
                  {INFLUENCE_MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted">Social visibility</span>
            <select
              className={codexFieldClass}
              value={parsed.organizationalVisibility ?? ''}
              onChange={(e) =>
                void persist({
                  organizationalVisibility: e.target.value
                    ? (e.target.value as OrganizationMetadataFields['organizationalVisibility'])
                    : null,
                })
              }
              disabled={saving}
            >
              <option value="">—</option>
              {ORGANIZATIONAL_VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {ORGANIZATIONAL_VISIBILITY_LABELS[v]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted">Known methods</span>
          <input
            className={codexFieldClass}
            value={parsed.methods ?? ''}
            onChange={(e) => void persist({ methods: e.target.value || null })}
            disabled={saving}
            placeholder="How they exert influence"
          />
        </label>
        <PageIdListEditor
          label="Strongholds"
          ids={parsed.strongholdLocationIds}
          pickerPages={locationPages}
          flatPages={flatPages}
          placeholder="Search strongholds…"
          onChange={(next) => void persist({ strongholdLocationIds: next })}
        />
        <PageIdListEditor
          label="Influence reaches"
          ids={parsed.influenceRegionIds}
          pickerPages={locationPages}
          flatPages={flatPages}
          placeholder="Search influence regions…"
          onChange={(next) => void persist({ influenceRegionIds: next })}
        />
        <PageIdListEditor
          label="Active territories"
          ids={parsed.activeTerritoryIds}
          pickerPages={locationPages}
          flatPages={flatPages}
          placeholder="Search territories…"
          onChange={(next) => void persist({ activeTerritoryIds: next })}
        />
        <PageIdListEditor
          label="Hidden enclaves"
          ids={parsed.hiddenEnclaveIds}
          pickerPages={locationPages}
          flatPages={flatPages}
          placeholder="Search hidden enclaves…"
          onChange={(next) => void persist({ hiddenEnclaveIds: next })}
        />
        <PageIdListEditor
          label="Trade reach"
          ids={parsed.tradeReachRegionIds}
          pickerPages={locationPages}
          flatPages={flatPages}
          placeholder="Search trade regions…"
          onChange={(next) => void persist({ tradeReachRegionIds: next })}
        />
        <PageIdListEditor
          label="Contested zones"
          ids={parsed.contestedZoneIds}
          pickerPages={locationPages}
          flatPages={flatPages}
          placeholder="Search contested zones…"
          onChange={(next) => void persist({ contestedZoneIds: next })}
        />
        {error ? (
          <p className="text-xs text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(projection?.influenceModeLabel || projection?.visibilityLabel) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {projection.influenceModeLabel ? (
            <span className="rounded-full border border-border/60 px-2 py-0.5">
              {projection.influenceModeLabel}
            </span>
          ) : null}
          {projection.visibilityLabel ? (
            <span className="rounded-full border border-border/60 px-2 py-0.5 text-muted">
              {projection.visibilityLabel}
            </span>
          ) : null}
        </div>
      )}
      {projection?.knownMethods ? (
        <p className="text-sm text-foreground/80">
          <span className="text-muted">Known methods:</span> {projection.knownMethods}
        </p>
      ) : null}
      {projection?.sections.length === 0 ? (
        <p className="text-sm text-muted">No presence recorded yet.</p>
      ) : (
        projection?.sections.map((section) => (
          <section key={section.label} className="space-y-2">
            <h3 className={META_SECTION_LABEL_CLASS}>
              {section.label}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {section.locationIds.map((locId, i) => (
                <li key={locId}>
                  <EntityRelationChip
                    campaignHandle={campaignHandle}
                    pageId={locId}
                    title={section.locationTitles[i] ?? locId}
                    templateType={
                      snapshots.find((s) => s.id === locId)?.templateType ?? 'DEFAULT'
                    }
                    flatPages={snapshots}
                    compact
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
