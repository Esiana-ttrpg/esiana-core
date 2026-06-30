import { META_FIELD_LABEL_CLASS, META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBlockDraft } from '@/hooks/useBlockDraft';
import { useBlockDraftFlush } from '@/hooks/useBlockDraftFlush';
import { useRegisterBlockDraft } from '@/contexts/PageBlockDraftRegistry';
import { diffRecordPatch } from '@/lib/blockDraftFlush';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { CampaignChronologyDateField } from '@/components/entity/CampaignChronologyDateField';
import { OrganizationEmblemField } from '@/components/entity/OrganizationEmblemField';
import {
  ORG_RELATION_CATEGORIES,
  ORG_RELATION_STANCES,
  RELATION_VISIBILITIES,
  normalizeRecordId,
  type ChronologyDateParts,
} from '@/lib/entityRelationTypes';
import {
  INFLUENCE_MODES,
  INFLUENCE_MODE_LABELS,
  MAX_CURRENT_PRESSURES,
  OPERATIONAL_SCALES,
  OPERATIONAL_SCALE_LABELS,
  ORGANIZATION_STATUSES,
  ORGANIZATION_SYMBOL_PRESETS,
  ORGANIZATION_WORLD_STATES,
  ORGANIZATION_WORLD_STATE_LABELS,
  ORGANIZATIONAL_VISIBILITIES,
  ORGANIZATIONAL_VISIBILITY_LABELS,
  STRUCTURAL_ROLES,
  STRUCTURAL_ROLE_LABELS,
  parseOrganizationMetadata,
  resolveOrgStanceAt,
  type OrganizationMetadataFields,
  type OrganizationRelation,
  type OrganizationRelationEvent,
  type OrganizationStatus,
} from '@/lib/organizationMetadata';
import { SYMBOL_PRESET_LABELS } from '@/lib/organizationSymbolPresets';
import {
  filterLocationPages,
  filterNpcPages,
  filterOrganizationPages,
} from '@/lib/questHubLayout';
import { OrganizationEraTrajectoriesBlock } from '@/components/entity/OrganizationEraTrajectoriesBlock';
import { updateOrganizationMetadata } from '@/lib/wiki';
import { fetchTimeTracking } from '@/lib/timeTrackingApi';
import { defaultQuestDate, resolveMasterCalendarLike } from '@/lib/chronologyCalendar';
import type { FantasyCalendarLike } from '@/lib/timeEngine';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface OrganizationMetadataEditorProps {
  campaignHandle: string;
  pageId: string;
  blockId?: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  onSaved: (metadata: Record<string, unknown>) => void;
  section?: 'identity' | 'symbol' | 'pressures' | 'duality' | 'leadership' | 'diplomacy' | 'all';
  bare?: boolean;
  focusField?: string | null;
}

export function OrganizationMetadataEditor({
  campaignHandle,
  pageId,
  blockId,
  metadata,
  flatPages,
  onSaved,
  section = 'all',
  bare = false,
  focusField = null,
}: OrganizationMetadataEditorProps) {
  const source = useMemo(() => parseOrganizationMetadata(metadata), [metadata]);
  const draftBlockId = blockId ?? `entity-org-hero:${pageId}`;
  const { draft, setDraft, dirty, markCommitted } = useBlockDraft({
    blockId: draftBlockId,
    source,
    serialize: (value) => JSON.stringify(value),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaignNow, setCampaignNow] = useState<ChronologyDateParts>(
    defaultQuestDate(null),
  );
  const [calendarLike, setCalendarLike] = useState<FantasyCalendarLike | null>(null);

  const npcPages = filterNpcPages(flatPages);
  const locationPages = filterLocationPages(flatPages);
  const orgPages = useMemo(
    () => filterOrganizationPages(flatPages).filter((p) => p.id !== pageId),
    [flatPages, pageId],
  );

  useEffect(() => {
    let cancelled = false;
    void fetchTimeTracking(campaignHandle)
      .then((bundle) => {
        if (cancelled) return;
        setCampaignNow(defaultQuestDate(bundle));
        setCalendarLike(resolveMasterCalendarLike(bundle));
      })
      .catch(() => {
        if (!cancelled) setCalendarLike(null);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  const persist = useCallback(
    async (patch: Partial<OrganizationMetadataFields>) => {
      setDraft((prev) => ({ ...prev, ...patch }));
      setSaving(true);
      setError(null);
      try {
        const result = await updateOrganizationMetadata(campaignHandle, pageId, patch);
        markCommitted(parseOrganizationMetadata(result.metadata));
        onSaved(result.metadata);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save organization data');
      } finally {
        setSaving(false);
      }
    },
    [campaignHandle, markCommitted, onSaved, pageId, setDraft],
  );

  const flushDraft = useBlockDraftFlush(
    useCallback(async () => {
      if (!dirty) return;
      const patch = diffRecordPatch(
        source,
        draft,
        Object.keys(source) as (keyof OrganizationMetadataFields)[],
      );
      if (Object.keys(patch).length === 0) return;
      await persist(patch);
    }, [dirty, draft, persist, source]),
  );
  useRegisterBlockDraft(draftBlockId, dirty, flushDraft);

  function addRelation() {
    const firstTarget = orgPages[0]?.id;
    if (!firstTarget) return;
    const relation: OrganizationRelation = {
      id: normalizeRecordId(undefined),
      targetOrgId: firstTarget,
      history: [
        {
          id: normalizeRecordId(undefined),
          effectiveDate: campaignNow,
          relationType: 'DIPLOMATIC',
          stance: 'NEUTRAL',
          visibility: 'GM_ONLY',
          note: null,
        },
      ],
    };
    void persist({ relations: [...draft.relations, relation] });
  }

  function updateRelation(relationId: string, patch: Partial<OrganizationRelation>) {
    const next = draft.relations.map((rel) =>
      rel.id === relationId ? { ...rel, ...patch } : rel,
    );
    void persist({ relations: next });
  }

  function removeRelation(relationId: string) {
    void persist({ relations: draft.relations.filter((rel) => rel.id !== relationId) });
  }

  function addRelationEvent(relationId: string) {
    const next = draft.relations.map((rel) => {
      if (rel.id !== relationId) return rel;
      const event: OrganizationRelationEvent = {
        id: normalizeRecordId(undefined),
        effectiveDate: campaignNow,
        relationType: 'DIPLOMATIC',
        stance: 'NEUTRAL',
        visibility: 'GM_ONLY',
        note: null,
      };
      return { ...rel, history: [...rel.history, event] };
    });
    void persist({ relations: next });
  }

  function updateRelationEvent(
    relationId: string,
    eventId: string,
    patch: Partial<OrganizationRelationEvent>,
  ) {
    const next = draft.relations.map((rel) => {
      if (rel.id !== relationId) return rel;
      return {
        ...rel,
        history: rel.history.map((event) =>
          event.id === eventId ? { ...event, ...patch } : event,
        ),
      };
    });
    void persist({ relations: next });
  }

  function removeRelationEvent(relationId: string, eventId: string) {
    const next = draft.relations.map((rel) => {
      if (rel.id !== relationId) return rel;
      return {
        ...rel,
        history: rel.history.filter((event) => event.id !== eventId),
      };
    });
    void persist({ relations: next });
  }

  const showIdentity = section === 'all' || section === 'identity';
  const showSymbol = section === 'all' || section === 'symbol';
  const showPressures = section === 'all' || section === 'pressures';
  const showDuality = section === 'all' || section === 'duality';
  const showLeadership = section === 'all' || section === 'leadership';
  const showDiplomacy = section === 'all' || section === 'diplomacy';

  function focusClass(field: string): string {
    return focusField === field ? 'ring-1 ring-primary/50' : '';
  }

  const body = (
    <>
      {showIdentity ? (
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Type
          </span>
          <input
            className={fieldClass}
            value={draft.orgType ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, orgType: e.target.value }))}
            onBlur={() => void persist({ orgType: draft.orgType })}
          />
        </label>
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Region
          </span>
          <input
            className={fieldClass}
            value={draft.region ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, region: e.target.value }))}
            onBlur={() => void persist({ region: draft.region })}
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className={META_FIELD_LABEL_CLASS}>
            Motto
          </span>
          <input
            className={fieldClass}
            value={draft.motto ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, motto: e.target.value }))}
            onBlur={() => void persist({ motto: draft.motto })}
          />
        </label>
        <label className={`space-y-1 sm:col-span-2 ${focusClass('publicPurpose')}`}>
          <span className={META_FIELD_LABEL_CLASS}>
            Public purpose
          </span>
          <input
            className={fieldClass}
            value={draft.publicPurpose ?? draft.motivation ?? ''}
            onChange={(e) =>
              setDraft((p) => ({ ...p, publicPurpose: e.target.value, motivation: e.target.value }))
            }
            onBlur={() =>
              void persist({
                publicPurpose: draft.publicPurpose ?? draft.motivation,
                motivation: draft.publicPurpose ?? draft.motivation,
              })
            }
          />
        </label>
        <label className={`space-y-1 sm:col-span-2 ${focusClass('publicReputation')}`}>
          <span className={META_FIELD_LABEL_CLASS}>
            Street belief
          </span>
          <input
            className={fieldClass}
            value={draft.publicReputation ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, publicReputation: e.target.value }))}
            onBlur={() => void persist({ publicReputation: draft.publicReputation })}
            placeholder="What ordinary people believe about them"
          />
        </label>
        <label className={`space-y-1 ${focusClass('worldState')}`}>
          <span className={META_FIELD_LABEL_CLASS}>
            World state
          </span>
          <select
            className={fieldClass}
            value={draft.worldState ?? ''}
            onChange={(e) =>
              void persist({
                worldState: e.target.value
                  ? (e.target.value as OrganizationMetadataFields['worldState'])
                  : null,
              })
            }
          >
            <option value="">—</option>
            {ORGANIZATION_WORLD_STATES.map((state) => (
              <option key={state} value={state}>
                {ORGANIZATION_WORLD_STATE_LABELS[state]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Scale
          </span>
          <select
            className={fieldClass}
            value={draft.operationalScale ?? ''}
            onChange={(e) =>
              void persist({
                operationalScale: e.target.value
                  ? (e.target.value as OrganizationMetadataFields['operationalScale'])
                  : null,
              })
            }
          >
            <option value="">—</option>
            {OPERATIONAL_SCALES.map((scale) => (
              <option key={scale} value={scale}>
                {OPERATIONAL_SCALE_LABELS[scale]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className={META_FIELD_LABEL_CLASS}>
            Known methods
          </span>
          <input
            className={fieldClass}
            value={draft.methods ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, methods: e.target.value }))}
            onBlur={() => void persist({ methods: draft.methods })}
            placeholder="How they operate in the world"
          />
        </label>
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Influence mode
          </span>
          <select
            className={fieldClass}
            value={draft.influenceMode ?? ''}
            onChange={(e) =>
              void persist({
                influenceMode: e.target.value
                  ? (e.target.value as OrganizationMetadataFields['influenceMode'])
                  : null,
              })
            }
          >
            <option value="">—</option>
            {INFLUENCE_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {INFLUENCE_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Social visibility
          </span>
          <select
            className={fieldClass}
            value={draft.organizationalVisibility ?? ''}
            onChange={(e) =>
              void persist({
                organizationalVisibility: e.target.value
                  ? (e.target.value as OrganizationMetadataFields['organizationalVisibility'])
                  : null,
              })
            }
          >
            <option value="">—</option>
            {ORGANIZATIONAL_VISIBILITIES.map((vis) => (
              <option key={vis} value={vis}>
                {ORGANIZATIONAL_VISIBILITY_LABELS[vis]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Structural role
          </span>
          <select
            className={fieldClass}
            value={draft.structuralRole ?? ''}
            onChange={(e) =>
              void persist({
                structuralRole: e.target.value
                  ? (e.target.value as OrganizationMetadataFields['structuralRole'])
                  : null,
              })
            }
          >
            <option value="">—</option>
            {STRUCTURAL_ROLES.map((role) => (
              <option key={role} value={role}>
                {STRUCTURAL_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Lifecycle status
          </span>
          <select
            className={fieldClass}
            value={draft.organizationStatus}
            onChange={(e) =>
              void persist({
                organizationStatus: e.target.value as OrganizationStatus,
              })
            }
          >
            {ORGANIZATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <CampaignChronologyDateField
          campaignHandle={campaignHandle}
          label="Status effective date"
          value={draft.statusEffectiveDate}
          calendarLike={calendarLike}
          defaultDate={campaignNow}
          disabled={saving}
          onChange={(next) => void persist({ statusEffectiveDate: next })}
        />
        <label className="space-y-1 sm:col-span-2">
          <span className={META_FIELD_LABEL_CLASS}>
            Status reason
          </span>
          <input
            className={fieldClass}
            value={draft.statusReason ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, statusReason: e.target.value }))}
            onBlur={() => void persist({ statusReason: draft.statusReason })}
            placeholder="e.g. Collapsed after siege of Ashford"
          />
        </label>
      </div>
      ) : null}

      {showSymbol ? (
        <div className={`space-y-3 ${focusClass('symbolPreset')}`}>
          <div className={focusClass('emblemAssetId')}>
            <OrganizationEmblemField
              campaignHandle={campaignHandle}
              value={draft.emblemAssetId}
              disabled={saving}
              onChange={(assetId) => void persist({ emblemAssetId: assetId })}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className={META_FIELD_LABEL_CLASS}>
              Symbol preset
            </span>
            <select
              className={fieldClass}
              value={draft.symbolPreset ?? ''}
              onChange={(e) =>
                void persist({
                  symbolPreset: e.target.value
                    ? (e.target.value as OrganizationMetadataFields['symbolPreset'])
                    : null,
                })
              }
            >
              <option value="">—</option>
              {ORGANIZATION_SYMBOL_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {SYMBOL_PRESET_LABELS[preset]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className={META_FIELD_LABEL_CLASS}>
              Doctrine tint
            </span>
            <input
              className={fieldClass}
              type="color"
              value={draft.doctrineTint ?? '#64748b'}
              onChange={(e) => void persist({ doctrineTint: e.target.value })}
            />
          </label>
          </div>
        </div>
      ) : null}

      {showPressures ? (
        <div className={`space-y-2 ${focusClass('currentPressures')}`}>
          <span className={META_SECTION_LABEL_CLASS}>
            Current pressures
          </span>
          {draft.currentPressures.map((pressure, index) => (
            <div key={index} className="flex gap-2">
              <input
                className={fieldClass}
                value={pressure}
                onChange={(e) => {
                  const next = [...draft.currentPressures];
                  next[index] = e.target.value;
                  setDraft((p) => ({ ...p, currentPressures: next }));
                }}
                onBlur={() => void persist({ currentPressures: draft.currentPressures })}
                placeholder="Active campaign stressor"
              />
              <button
                type="button"
                onClick={() =>
                  void persist({
                    currentPressures: draft.currentPressures.filter((_, i) => i !== index),
                  })
                }
                className="rounded p-1 text-muted hover:text-red-400"
                aria-label="Remove pressure"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {draft.currentPressures.length < MAX_CURRENT_PRESSURES ? (
            <button
              type="button"
              onClick={() =>
                void persist({ currentPressures: [...draft.currentPressures, ''] })
              }
              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <Plus className="size-3" />
              Add pressure
            </button>
          ) : null}
          <OrganizationEraTrajectoriesBlock
            campaignHandle={campaignHandle}
            draft={draft}
            setDraft={setDraft}
            onPersist={persist}
          />
        </div>
      ) : null}

      {showDuality ? (
        <label className={`space-y-1 ${focusClass('privateAgenda')}`}>
          <span className={META_FIELD_LABEL_CLASS}>
            Private agenda (DM only)
          </span>
          <textarea
            className={`${fieldClass} min-h-[4rem]`}
            value={draft.privateAgenda ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, privateAgenda: e.target.value }))}
            onBlur={() => void persist({ privateAgenda: draft.privateAgenda })}
            placeholder="What they are actually pursuing"
          />
        </label>
      ) : null}

      {showLeadership ? (
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Leader
          </span>
          <IdentityPagePicker
            flatPages={npcPages}
            lookupPages={flatPages}
            value={draft.leaderId}
            placeholder="Search characters…"
            onChange={(nextId) => void persist({ leaderId: nextId })}
          />
        </label>
        <label className="space-y-1">
          <span className={META_FIELD_LABEL_CLASS}>
            Headquarters
          </span>
          <IdentityPagePicker
            flatPages={locationPages}
            lookupPages={flatPages}
            value={draft.headquartersId}
            placeholder="Search locations…"
            onChange={(nextId) => void persist({ headquartersId: nextId })}
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className={META_FIELD_LABEL_CLASS}>
            Parent organization
          </span>
          <IdentityPagePicker
            flatPages={orgPages}
            lookupPages={flatPages}
            value={draft.parentOrgId}
            placeholder="Search organizations…"
            onChange={(nextId) => void persist({ parentOrgId: nextId })}
          />
        </label>
      </div>
      ) : null}

      {showDiplomacy ? (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={META_SECTION_LABEL_CLASS}>
            Relation ledger
          </span>
          <button
            type="button"
            onClick={addRelation}
            disabled={orgPages.length === 0}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[10px] text-foreground hover:border-primary/40 disabled:opacity-50"
          >
            <Plus className="size-3" />
            Add relation
          </button>
        </div>

        {draft.relations.length === 0 && (
          <p className="text-xs text-muted">No diplomatic relations recorded yet.</p>
        )}

        {draft.relations.map((relation) => {
          const target = orgPages.find((p) => p.id === relation.targetOrgId);
          const current = resolveOrgStanceAt(relation, campaignNow);
          return (
            <div
              key={relation.id}
              className="space-y-2 rounded border border-border/80 bg-background/40 p-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className={fieldClass}
                  value={relation.targetOrgId}
                  onChange={(e) =>
                    updateRelation(relation.id, { targetOrgId: e.target.value })
                  }
                >
                  {orgPages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.title}
                    </option>
                  ))}
                </select>
                {current && (
                  <span className="rounded bg-surface px-2 py-0.5 text-[10px] text-muted">
                    Now: {current.relationType} / {current.stance}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeRelation(relation.id)}
                  className="ml-auto rounded p-1 text-muted hover:text-red-400"
                  aria-label={`Remove relation to ${target?.title ?? 'organization'}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                {relation.history.map((event) => (
                  <div
                    key={event.id}
                    className="grid gap-1 rounded border border-border/60 p-2 sm:grid-cols-2"
                  >
                    <CampaignChronologyDateField
                      campaignHandle={campaignHandle}
                      label="Effective date"
                      value={event.effectiveDate}
                      calendarLike={calendarLike}
                      defaultDate={campaignNow}
                      disabled={saving}
                      onChange={(next) =>
                        next &&
                        updateRelationEvent(relation.id, event.id, {
                          effectiveDate: next,
                        })
                      }
                    />
                    <label className="space-y-1">
                      <span className={META_FIELD_LABEL_CLASS}>
                        Relation type
                      </span>
                      <select
                        className={fieldClass}
                        value={event.relationType}
                        onChange={(e) =>
                          updateRelationEvent(relation.id, event.id, {
                            relationType: e.target.value as OrganizationRelationEvent['relationType'],
                          })
                        }
                      >
                        {ORG_RELATION_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className={META_FIELD_LABEL_CLASS}>
                        Stance
                      </span>
                      <select
                        className={fieldClass}
                        value={event.stance}
                        onChange={(e) =>
                          updateRelationEvent(relation.id, event.id, {
                            stance: e.target.value as OrganizationRelationEvent['stance'],
                          })
                        }
                      >
                        {ORG_RELATION_STANCES.map((stance) => (
                          <option key={stance} value={stance}>
                            {stance}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className={META_FIELD_LABEL_CLASS}>
                        Visibility
                      </span>
                      <select
                        className={fieldClass}
                        value={event.visibility}
                        onChange={(e) =>
                          updateRelationEvent(relation.id, event.id, {
                            visibility: e.target.value as OrganizationRelationEvent['visibility'],
                          })
                        }
                      >
                        {RELATION_VISIBILITIES.map((vis) => (
                          <option key={vis} value={vis}>
                            {vis}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1 sm:col-span-2">
                      <span className={META_FIELD_LABEL_CLASS}>
                        Note
                      </span>
                      <input
                        className={fieldClass}
                        value={event.note ?? ''}
                        onChange={(e) =>
                          updateRelationEvent(relation.id, event.id, {
                            note: e.target.value,
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeRelationEvent(relation.id, event.id)}
                      className="text-[10px] text-muted hover:text-red-400 sm:col-span-2"
                    >
                      Remove event
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => addRelationEvent(relation.id)}
                className="text-[10px] text-primary hover:underline"
              >
                Add dated event
              </button>
            </div>
          );
        })}
      </div>
      ) : null}

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </>
  );

  if (bare) {
    return (
      <div className="relative space-y-3">
        {saving ? (
          <Loader2 className="absolute right-0 top-0 size-3.5 animate-spin text-muted" />
        ) : null}
        {body}
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className={META_SECTION_LABEL_CLASS}>
          Organization registry
        </h3>
        {saving && <Loader2 className="size-3.5 animate-spin text-muted" />}
      </div>
      {body}
    </section>
  );
}
