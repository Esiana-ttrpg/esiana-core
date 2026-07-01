import { META_FIELD_LABEL_CLASS, META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import {
  parseQuestMetadata,
  type QuestMetadataFields,
} from '@/lib/questMetadata';
import {
  clearQuestMetadata,
  fetchQuestLifecycleStates,
  patchQuestLifecycle,
  updateQuestMetadata,
  updateWikiPage,
  updateWikiPageMetadataField,
} from '@/lib/wiki';
import {
  NarrativeLifecycleStates,
  type NarrativeLifecycleState,
} from '@shared/narrativeLifecycle';
import { readCategoryMetadataField } from '@/lib/wikiMetadata';
import { fetchTimeTracking } from '@/lib/timeTrackingApi';
import {
  defaultQuestDate,
  resolveMasterCalendarLike,
} from '@/lib/chronologyCalendar';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { QuestCardProperties } from '@/components/quest/QuestCardProperties';
import {
  QuestTimePressureEditor,
  QuestTimePressureSummary,
} from '@/components/quest/QuestTimePressureEditor';
import {
  filterNpcPages,
  filterOrganizationPages,
} from '@/lib/questHubLayout';
import type { FantasyCalendarLike } from '@/lib/timeEngine';
import type { WikiTag, WikiTagInput, WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface QuestMetadataEditorProps {
  campaignHandle: string;
  pageId: string;
  pageTitle?: string;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  pageTags: WikiTagInput[];
  allCampaignTags: WikiTag[];
  onPageTagsChange: (tags: WikiTagInput[]) => void;
  onSaved: (metadata: Record<string, unknown>) => void;
  section?: 'quest' | 'rewards' | 'all';
  bare?: boolean;
}

export function QuestMetadataEditor({
  campaignHandle,
  pageId,
  pageTitle = 'Quest',
  metadata,
  flatPages,
  pageTags,
  allCampaignTags,
  onPageTagsChange,
  onSaved,
  section = 'all',
  bare = false,
}: QuestMetadataEditorProps) {
  const parsed = parseQuestMetadata(metadata);
  const [draft, setDraft] = useState<QuestMetadataFields>(parsed);
  const [lifecycleState, setLifecycleState] = useState<NarrativeLifecycleState>(
    NarrativeLifecycleStates.LOCKED,
  );
  const [tagsDraft, setTagsDraft] = useState<WikiTagInput[]>(pageTags);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarLike, setCalendarLike] = useState<FantasyCalendarLike | null>(
    null,
  );
  const [defaultDate, setDefaultDate] = useState(defaultQuestDate(null));
  const [locationDraft, setLocationDraft] = useState('');
  const [progressDraft, setProgressDraft] = useState('');

  const npcPages = filterNpcPages(flatPages);
  const orgPages = filterOrganizationPages(flatPages);

  useEffect(() => {
    setDraft(parseQuestMetadata(metadata));
  }, [metadata]);

  useEffect(() => {
    setTagsDraft(pageTags);
  }, [pageTags]);

  useEffect(() => {
    setLocationDraft(readCategoryMetadataField(metadata, 'Location') ?? '');
    setProgressDraft(readCategoryMetadataField(metadata, 'Progress') ?? '');
  }, [metadata]);

  useEffect(() => {
    let cancelled = false;
    void fetchTimeTracking(campaignHandle)
      .then((bundle) => {
        if (cancelled) return;
        const like = resolveMasterCalendarLike(bundle);
        setCalendarLike(like);
        setDefaultDate(defaultQuestDate(bundle));
      })
      .catch(() => {
        if (!cancelled) setCalendarLike(null);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  const loadLifecycle = useCallback(async () => {
    try {
      const data = await fetchQuestLifecycleStates(campaignHandle, [pageId]);
      const row = data.items.find((item) => item.subjectId === pageId);
      const state = (row?.lifecycleState ?? row?.visible) as NarrativeLifecycleState | null;
      if (state && (Object.values(NarrativeLifecycleStates) as string[]).includes(state)) {
        setLifecycleState(state);
      }
    } catch {
      setLifecycleState(NarrativeLifecycleStates.LOCKED);
    }
  }, [campaignHandle, pageId]);

  useEffect(() => {
    void loadLifecycle();
  }, [loadLifecycle]);

  async function handleLifecycleChange(next: NarrativeLifecycleState) {
    const previous = lifecycleState;
    setLifecycleState(next);
    setSaving(true);
    setError(null);
    try {
      const result = await patchQuestLifecycle(campaignHandle, pageId, next, pageTitle);
      setLifecycleState(result.lifecycleState as NarrativeLifecycleState);
      if (result.questStatus) {
        setDraft((prev) => {
          const updated = {
            ...prev,
            questStatus: result.questStatus as QuestMetadataFields['questStatus'],
          };
          const base =
            metadata && typeof metadata === 'object'
              ? { ...(metadata as Record<string, unknown>) }
              : {};
          onSaved({ ...base, ...updated });
          return updated;
        });
      }
    } catch (err) {
      setLifecycleState(previous);
      setError(err instanceof Error ? err.message : 'Failed to update quest status');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function persist(patch: Partial<QuestMetadataFields>) {
    const previous = { ...draft };
    setDraft((prev) => ({ ...prev, ...patch }));
    setSaving(true);
    setError(null);
    try {
      const result = await updateQuestMetadata(campaignHandle, pageId, patch);
      const next = parseQuestMetadata(result.metadata);
      setDraft(next);
      onSaved(result.metadata);
      if (patch.questStatus) {
        await loadLifecycle();
      }
    } catch (err) {
      setDraft(previous);
      setError(err instanceof Error ? err.message : 'Failed to save quest data');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleQuestPatch(patch: Partial<QuestMetadataFields>) {
    await persist(patch);
  }

  async function persistMetadataField(key: string, value: string) {
    setSaving(true);
    setError(null);
    try {
      const result = await updateWikiPageMetadataField(
        campaignHandle,
        pageId,
        key,
        value,
      );
      onSaved(result.metadata as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quest data');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleTagsChange(next: WikiTagInput[]) {
    const previous = tagsDraft;
    setTagsDraft(next);
    onPageTagsChange(next);
    setSaving(true);
    setError(null);
    try {
      await updateWikiPage(campaignHandle, pageId, { tags: next });
    } catch (err) {
      setTagsDraft(previous);
      onPageTagsChange(previous);
      setError(err instanceof Error ? err.message : 'Failed to save tags');
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!window.confirm('Clear all quest metadata for this page?')) return;
    setSaving(true);
    setError(null);
    try {
      const result = await clearQuestMetadata(campaignHandle, pageId);
      const next = parseQuestMetadata(result.metadata);
      setDraft(next);
      onSaved(result.metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset quest data');
    } finally {
      setSaving(false);
    }
  }

  const showQuest = section === 'all' || section === 'quest';
  const showRewards = section === 'all' || section === 'rewards';

  const body = (
    <>
      {error && (
        <p className="rounded-md bg-red-950/40 px-2 py-0.5 text-[11px] text-red-300">
          {error}
        </p>
      )}

      {showQuest ? (
        <>
      {calendarLike ? (
        <QuestCardProperties
          quest={draft}
          tags={tagsDraft}
          calendarLike={calendarLike}
          defaultDate={defaultDate}
          allCampaignTags={allCampaignTags}
          horizontal
          questStatus={draft.questStatus}
          onQuestStatusChange={(questStatus) => {
            setDraft((prev) => ({ ...prev, questStatus }));
            void persist({ questStatus });
          }}
          lifecycleState={lifecycleState}
          onLifecycleChange={handleLifecycleChange}
          progressValue={progressDraft}
          onProgressChange={setProgressDraft}
          onProgressBlur={() => {
            const next = progressDraft.trim();
            const saved = readCategoryMetadataField(metadata, 'Progress') ?? '';
            if (next === saved) return;
            void persistMetadataField('Progress', next);
          }}
          fieldsDisabled={saving}
          onQuestPatch={handleQuestPatch}
          onTagsChange={handleTagsChange}
        />
      ) : (
        <p className="text-xs text-muted">
          Load campaign time tracking to edit quest dates.
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="block min-w-0 space-y-0.5">
          <span className={META_FIELD_LABEL_CLASS}>
            Location
          </span>
          <input
            type="text"
            className="h-7 w-full rounded-md border border-border bg-background px-2 py-0.5 text-xs text-foreground outline-none focus:border-primary/60"
            disabled={saving}
            value={locationDraft}
            onChange={(event) => setLocationDraft(event.target.value)}
            onBlur={() => {
              const next = locationDraft.trim();
              const saved = readCategoryMetadataField(metadata, 'Location') ?? '';
              if (next === saved) return;
              void persistMetadataField('Location', next);
            }}
            placeholder="Quest location…"
          />
        </label>

        <div className="min-w-0 space-y-0.5">
          <span className={META_FIELD_LABEL_CLASS}>
            Quest giver (NPC)
          </span>
          <IdentityPagePicker
            flatPages={npcPages}
            value={draft.questGiverId}
            disabled={saving}
            placeholder="Search characters…"
            onChange={(nextId) => {
              setDraft((prev) => ({ ...prev, questGiverId: nextId }));
              void persist({ questGiverId: nextId });
            }}
          />
        </div>

        <div className="min-w-0 space-y-0.5">
          <span className={META_FIELD_LABEL_CLASS}>
            Faction / organization
          </span>
          <IdentityPagePicker
            flatPages={orgPages}
            value={draft.factionId}
            disabled={saving}
            placeholder="Search organizations…"
            onChange={(nextId) => {
              setDraft((prev) => ({ ...prev, factionId: nextId }));
              void persist({ factionId: nextId });
            }}
          />
        </div>
      </div>

      <QuestTimePressureSummary metadata={metadata} />
      <QuestTimePressureEditor
        campaignHandle={campaignHandle}
        pageId={pageId}
        metadata={metadata}
        onSaved={onSaved}
      />
        </>
      ) : null}

      {showRewards ? (
      <>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <label className="block min-w-0 space-y-0.5">
          <span className={META_FIELD_LABEL_CLASS}>
            Public rewards
          </span>
          <textarea
            className={fieldClass}
            rows={2}
            disabled={saving}
            value={draft.rewardsText ?? ''}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                rewardsText: event.target.value || null,
              }))
            }
            onBlur={() => void persist({ rewardsText: draft.rewardsText })}
            placeholder="Loot visible to the party…"
          />
        </label>

        <label className="block min-w-0 space-y-0.5">
          <span className={`${META_SECTION_LABEL_CLASS} text-amber-400/90`}>
            DM-only rewards
          </span>
          <textarea
            className={fieldClass}
            rows={2}
            disabled={saving}
            value={draft.dmRewardsText ?? ''}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                dmRewardsText: event.target.value || null,
              }))
            }
            onBlur={() => void persist({ dmRewardsText: draft.dmRewardsText })}
            placeholder="Hidden notes for DMs…"
          />
        </label>
      </div>

      <details className="rounded border border-border/60 p-2">
        <summary className="cursor-pointer META_SECTION_LABEL_CLASS">
          Treasury reward (optional)
        </summary>
        <p className="mt-2 text-[11px] text-muted-foreground">
          When this quest is marked completed, the GM gets a suggested ledger credit to review —
          never an automatic balance change.
        </p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <label className={`block space-y-0.5 ${META_FIELD_LABEL_CLASS}`}>
            Amount
            <input
              className={fieldClass}
              inputMode="numeric"
              disabled={saving}
              value={
                draft.ledgerReward?.amount != null
                  ? String(draft.ledgerReward.amount)
                  : ''
              }
              onChange={(event) => {
                const amount = Number.parseInt(event.target.value, 10);
                setDraft((prev) => ({
                  ...prev,
                  ledgerReward:
                    Number.isFinite(amount) && amount > 0
                      ? {
                          amount,
                          recipient: prev.ledgerReward?.recipient ?? 'party',
                          contributorPageId: prev.ledgerReward?.contributorPageId ?? null,
                        }
                      : null,
                }));
              }}
              onBlur={() => void persist({ ledgerReward: draft.ledgerReward })}
              placeholder="700"
            />
          </label>
          <label className={`block space-y-0.5 ${META_FIELD_LABEL_CLASS}`}>
            Recipient
            <select
              className={fieldClass}
              disabled={saving || !draft.ledgerReward}
              value={draft.ledgerReward?.recipient ?? 'party'}
              onChange={(event) => {
                const recipient =
                  event.target.value === 'individual' ? 'individual' : 'party';
                setDraft((prev) =>
                  prev.ledgerReward
                    ? { ...prev, ledgerReward: { ...prev.ledgerReward, recipient } }
                    : prev,
                );
              }}
              onBlur={() => void persist({ ledgerReward: draft.ledgerReward })}
            >
              <option value="party">Party treasury</option>
              <option value="individual">Individual</option>
            </select>
          </label>
        </div>
      </details>
      </>
      ) : null}

      {showQuest ? (
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleReset()}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-muted hover:border-red-500/40 hover:text-red-300"
      >
        <RotateCcw className="size-3" />
        Reset quest data
      </button>
      ) : null}
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
    <section className="space-y-2 rounded-lg border border-border bg-surface/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className={META_SECTION_LABEL_CLASS}>
          Quest properties
        </h3>
        {saving && <Loader2 className="size-3.5 animate-spin text-muted" />}
      </div>
      {body}
    </section>
  );
}
