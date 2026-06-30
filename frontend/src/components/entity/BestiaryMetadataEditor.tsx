import { META_FIELD_LABEL_CLASS, META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useMemo, useState } from 'react';
import { useBlockDraft } from '@/hooks/useBlockDraft';
import { useBlockDraftFlush } from '@/hooks/useBlockDraftFlush';
import { useRegisterBlockDraft } from '@/contexts/PageBlockDraftRegistry';
import { diffRecordPatch } from '@/lib/blockDraftFlush';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { PortraitImageEditor } from '@/components/entity/codexMetadataEditorShared';
import {
  parseBestiaryMetadata,
  type BestiaryMetadataFields,
} from '@/lib/bestiaryMetadata';
import { filterBestiaryPages, filterLocationPages } from '@/lib/questHubLayout';
import { updateBestiaryMetadata } from '@/lib/wiki';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface BestiaryMetadataEditorProps {
  campaignHandle: string;
  pageId: string;
  blockId?: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  onSaved: (metadata: Record<string, unknown>) => void;
  section?: 'identity' | 'habitat' | 'ecology' | 'intel' | 'relationships' | 'appearance' | 'all';
  bare?: boolean;
  focusField?: string | null;
}

function filterBestiaryPagesForEditor(flatPages: WikiTreeNode[], pageId: string): WikiTreeNode[] {
  return filterBestiaryPages(flatPages, pageId);
}

export function BestiaryMetadataEditor({
  campaignHandle,
  pageId,
  blockId,
  metadata,
  flatPages,
  onSaved,
  section = 'all',
  bare = false,
  focusField,
}: BestiaryMetadataEditorProps) {
  const source = useMemo(() => parseBestiaryMetadata(metadata), [metadata]);
  const draftBlockId = blockId ?? `entity-bestiary-hero:${pageId}`;
  const { draft, setDraft, dirty, markCommitted } = useBlockDraft({
    blockId: draftBlockId,
    source,
    serialize: (value) => JSON.stringify(value),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationPages = filterLocationPages(flatPages);
  const creaturePages = useMemo(
    () => filterBestiaryPagesForEditor(flatPages, pageId),
    [flatPages, pageId],
  );

  const persist = useCallback(
    async (patch: Partial<BestiaryMetadataFields>) => {
      setDraft((prev) => ({
        ...prev,
        ...patch,
        appearance: patch.appearance
          ? { ...prev.appearance, ...patch.appearance }
          : prev.appearance,
      }));
      setSaving(true);
      setError(null);
      try {
        const result = await updateBestiaryMetadata(campaignHandle, pageId, patch);
        markCommitted(parseBestiaryMetadata(result.metadata));
        onSaved(result.metadata);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save bestiary data');
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
        Object.keys(source) as (keyof BestiaryMetadataFields)[],
      );
      if (Object.keys(patch).length === 0) return;
      await persist(patch);
    }, [dirty, draft, persist, source]),
  );
  useRegisterBlockDraft(draftBlockId, dirty, flushDraft);

  const showIdentity = section === 'all' || section === 'identity';
  const showHabitat = section === 'all' || section === 'habitat';
  const showEcology =
    section === 'all' || section === 'ecology' || section === 'intel';
  const showRelationships = section === 'all' || section === 'relationships';
  const showAppearance = section === 'all' || section === 'appearance';

  const fieldId = (key: string) =>
    focusField === key ? 'character-field-' + key : undefined;

  const body = (
    <>
      {showIdentity ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2" id={fieldId('creatureType')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Creature type
            </span>
            <input
              className={fieldClass}
              value={draft.creatureType ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, creatureType: e.target.value }))}
              onBlur={() => void persist({ creatureType: draft.creatureType })}
            />
          </label>
          <label className="space-y-1" id={fieldId('region')}>
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
          <label className="space-y-1 sm:col-span-2" id={fieldId('knownFor')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Known for
            </span>
            <input
              className={fieldClass}
              value={draft.knownFor ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, knownFor: e.target.value }))}
              onBlur={() => void persist({ knownFor: draft.knownFor })}
            />
          </label>
          <label className="space-y-1 sm:col-span-2" id={fieldId('alsoKnownAs')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Also known as
            </span>
            <input
              className={fieldClass}
              value={draft.alsoKnownAs ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, alsoKnownAs: e.target.value }))}
              onBlur={() => void persist({ alsoKnownAs: draft.alsoKnownAs })}
            />
          </label>
        </div>
      ) : null}

      {showHabitat ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 sm:col-span-2" id={fieldId('habitat')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Habitat
            </span>
            <input
              className={fieldClass}
              value={draft.habitat ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, habitat: e.target.value }))}
              onBlur={() => void persist({ habitat: draft.habitat })}
            />
          </label>
          <label className="space-y-1" id={fieldId('threatLevel')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Threat level
            </span>
            <input
              className={fieldClass}
              value={draft.threatLevel ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, threatLevel: e.target.value }))}
              onBlur={() => void persist({ threatLevel: draft.threatLevel })}
            />
          </label>
          <label className="space-y-1" id={fieldId('intelligence')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Intelligence
            </span>
            <input
              className={fieldClass}
              value={draft.intelligence ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, intelligence: e.target.value }))}
              onBlur={() => void persist({ intelligence: draft.intelligence })}
            />
          </label>
          <label className="space-y-1 sm:col-span-2" id={fieldId('behaviorSummary')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Behavior
            </span>
            <textarea
              className={`${fieldClass} min-h-[4rem] resize-y`}
              value={draft.behaviorSummary ?? ''}
              onChange={(e) =>
                setDraft((p) => ({ ...p, behaviorSummary: e.target.value }))
              }
              onBlur={() => void persist({ behaviorSummary: draft.behaviorSummary })}
            />
          </label>
        </div>
      ) : null}

      {showEcology ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1" id={fieldId('temperament')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Temperament
            </span>
            <input
              className={fieldClass}
              value={draft.temperament ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, temperament: e.target.value }))}
              onBlur={() => void persist({ temperament: draft.temperament })}
            />
          </label>
          <label className="space-y-1" id={fieldId('encounterRate')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Encounter rate
            </span>
            <input
              className={fieldClass}
              value={draft.encounterRate ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, encounterRate: e.target.value }))}
              onBlur={() => void persist({ encounterRate: draft.encounterRate })}
            />
          </label>
          <label className="space-y-1 sm:col-span-2" id={fieldId('encounterConditions')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Encounter conditions
            </span>
            <input
              className={fieldClass}
              value={draft.encounterConditions ?? ''}
              onChange={(e) =>
                setDraft((p) => ({ ...p, encounterConditions: e.target.value }))
              }
              onBlur={() => void persist({ encounterConditions: draft.encounterConditions })}
            />
          </label>
          <label className="space-y-1 sm:col-span-2" id={fieldId('activePeriods')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Active periods (comma-separated)
            </span>
            <input
              className={fieldClass}
              value={draft.activePeriods.join(', ')}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  activePeriods: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                }))
              }
              onBlur={() => void persist({ activePeriods: draft.activePeriods })}
            />
          </label>
          <label className="space-y-1 sm:col-span-2" id={fieldId('weaknesses')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Weaknesses (comma-separated)
            </span>
            <input
              className={fieldClass}
              value={draft.weaknesses.join(', ')}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  weaknesses: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                }))
              }
              onBlur={() => void persist({ weaknesses: draft.weaknesses })}
            />
          </label>
          <label className="space-y-1 sm:col-span-2" id={fieldId('resistances')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Resistances (comma-separated)
            </span>
            <input
              className={fieldClass}
              value={draft.resistances.join(', ')}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  resistances: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                }))
              }
              onBlur={() => void persist({ resistances: draft.resistances })}
            />
          </label>
          <label className="space-y-1 sm:col-span-2" id={fieldId('immunities')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Immunities (comma-separated)
            </span>
            <input
              className={fieldClass}
              value={draft.immunities.join(', ')}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  immunities: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                }))
              }
              onBlur={() => void persist({ immunities: draft.immunities })}
            />
          </label>
          <label className="space-y-1" id={fieldId('factionAlignment')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Faction alignment
            </span>
            <input
              className={fieldClass}
              value={draft.factionAlignment ?? ''}
              onChange={(e) =>
                setDraft((p) => ({ ...p, factionAlignment: e.target.value }))
              }
              onBlur={() => void persist({ factionAlignment: draft.factionAlignment })}
            />
          </label>
          <label className="space-y-1" id={fieldId('corruptionAffinity')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Corruption affinity
            </span>
            <input
              className={fieldClass}
              value={draft.corruptionAffinity ?? ''}
              onChange={(e) =>
                setDraft((p) => ({ ...p, corruptionAffinity: e.target.value }))
              }
              onBlur={() => void persist({ corruptionAffinity: draft.corruptionAffinity })}
            />
          </label>
        </div>
      ) : null}

      {showRelationships ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={META_SECTION_LABEL_CLASS}>
                Related creatures
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                onClick={() => {
                  const first = creaturePages[0]?.id;
                  if (!first) return;
                  void persist({
                    relatedCreatureIds: [...draft.relatedCreatureIds, first],
                  });
                }}
              >
                <Plus className="size-3" /> Add
              </button>
            </div>
            {draft.relatedCreatureIds.map((creatureId) => (
              <div key={creatureId} className="flex items-center gap-2">
                <IdentityPagePicker
                  flatPages={creaturePages}
                  lookupPages={flatPages}
                  value={creatureId}
                  placeholder="Search creatures…"
                  onChange={(nextId) => {
                    if (!nextId) return;
                    const next = draft.relatedCreatureIds.map((id) =>
                      id === creatureId ? nextId : id,
                    );
                    void persist({ relatedCreatureIds: next });
                  }}
                />
                <button
                  type="button"
                  className="text-muted hover:text-destructive"
                  onClick={() =>
                    void persist({
                      relatedCreatureIds: draft.relatedCreatureIds.filter(
                        (id) => id !== creatureId,
                      ),
                    })
                  }
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={META_SECTION_LABEL_CLASS}>
                Related locations
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                onClick={() => {
                  const first = locationPages[0]?.id;
                  if (!first) return;
                  void persist({
                    relatedLocationIds: [...draft.relatedLocationIds, first],
                  });
                }}
              >
                <Plus className="size-3" /> Add
              </button>
            </div>
            {draft.relatedLocationIds.map((locationId) => (
              <div key={locationId} className="flex items-center gap-2">
                <IdentityPagePicker
                  flatPages={locationPages}
                  lookupPages={flatPages}
                  value={locationId}
                  placeholder="Search locations…"
                  onChange={(nextId) => {
                    if (!nextId) return;
                    const next = draft.relatedLocationIds.map((id) =>
                      id === locationId ? nextId : id,
                    );
                    void persist({ relatedLocationIds: next });
                  }}
                />
                <button
                  type="button"
                  className="text-muted hover:text-destructive"
                  onClick={() =>
                    void persist({
                      relatedLocationIds: draft.relatedLocationIds.filter(
                        (id) => id !== locationId,
                      ),
                    })
                  }
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {showAppearance ? (
        <div className="grid gap-2">
          <PortraitImageEditor
            campaignHandle={campaignHandle}
            portraitUrl={draft.appearance.portraitUrl}
            portraitCredit={draft.appearance.portraitCredit}
            onChange={({ portraitUrl, portraitCredit }) =>
              setDraft((p) => ({
                ...p,
                appearance: { ...p.appearance, portraitUrl, portraitCredit },
              }))
            }
            onPersist={async (fields) => {
              await persist({
                appearance: { ...draft.appearance, ...fields },
              });
            }}
          />
          <label className="space-y-1" id={fieldId('appearance.summary')}>
            <span className={META_FIELD_LABEL_CLASS}>
              Appearance summary
            </span>
            <textarea
              className={`${fieldClass} min-h-[4rem] resize-y`}
              value={draft.appearance.summary ?? ''}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  appearance: { ...p.appearance, summary: e.target.value },
                }))
              }
              onBlur={() =>
                void persist({
                  appearance: {
                    ...draft.appearance,
                    summary: draft.appearance.summary,
                  },
                })
              }
            />
          </label>
          <label className="space-y-1">
            <span className={META_FIELD_LABEL_CLASS}>
              Appearance tags (comma-separated)
            </span>
            <input
              className={fieldClass}
              value={draft.appearance.tags.join(', ')}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  appearance: {
                    ...p.appearance,
                    tags: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  },
                }))
              }
              onBlur={() =>
                void persist({
                  appearance: {
                    ...draft.appearance,
                    tags: draft.appearance.tags,
                  },
                })
              }
            />
          </label>
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {saving ? (
        <p className="flex items-center gap-1 text-[10px] text-muted">
          <Loader2 className="size-3 animate-spin" /> Saving…
        </p>
      ) : null}
    </>
  );

  if (bare) return body;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface/40 p-3">
      {body}
    </div>
  );
}
