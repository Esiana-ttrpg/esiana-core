import { useCallback, useEffect, useState } from 'react';
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
import type { FantasyCalendarLike } from '@/lib/timeEngine';
import type { WikiTagInput } from '@/types/wiki';

export function useQuestPageMetadata({
  campaignHandle,
  pageId,
  pageTitle,
  metadata,
  pageTags,
  onPageTagsChange,
  onSaved,
}: {
  campaignHandle: string;
  pageId: string;
  pageTitle?: string;
  metadata: unknown;
  pageTags: WikiTagInput[];
  onPageTagsChange: (tags: WikiTagInput[]) => void;
  onSaved: (metadata: Record<string, unknown>) => void;
}) {
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
  const [timeTrackingAvailable, setTimeTrackingAvailable] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    setDraft(parseQuestMetadata(metadata));
  }, [metadata]);

  useEffect(() => {
    setTagsDraft(pageTags);
  }, [pageTags]);

  useEffect(() => {
    setLocationDraft(readCategoryMetadataField(metadata, 'Location') ?? '');
  }, [metadata]);

  useEffect(() => {
    let cancelled = false;
    void fetchTimeTracking(campaignHandle)
      .then((bundle) => {
        if (cancelled) return;
        const like = resolveMasterCalendarLike(bundle);
        setCalendarLike(like);
        setDefaultDate(defaultQuestDate(bundle));
        setTimeTrackingAvailable(like != null);
      })
      .catch(() => {
        if (!cancelled) {
          setCalendarLike(null);
          setTimeTrackingAvailable(false);
        }
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
      const result = await patchQuestLifecycle(
        campaignHandle,
        pageId,
        next,
        pageTitle ?? 'Quest',
      );
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

  return {
    draft,
    setDraft,
    lifecycleState,
    tagsDraft,
    saving,
    error,
    calendarLike,
    defaultDate,
    timeTrackingAvailable,
    locationDraft,
    setLocationDraft,
    handleLifecycleChange,
    persist,
    persistMetadataField,
    handleTagsChange,
    handleReset,
    metadata,
  };
}