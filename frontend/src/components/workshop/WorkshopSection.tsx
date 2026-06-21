import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import {
  parseAuthoringContextFromSearch,
  readWorkshopDraftIdFromSearch,
} from '@shared/authoringContext';
import type { WorkshopDocument } from '@shared/workshopDocument';
import { NarrativeLayout } from '@/components/layout/NarrativeLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { EditorInstrumentationState } from '@/hooks/useEditorInstrumentation';
import { campaignProgressionPath } from '@/lib/campaignPaths';
import {
  createWorkshopDraft,
  fetchWorkshopDraft,
  fetchWorkshopDrafts,
  patchWorkshopDraft,
  countWikilinksInMarkdown,
} from '@/lib/workshopDrafts';
import { WorkshopAmbientCorner } from './WorkshopAmbientCorner';
import { WorkshopContinueDrafting } from './WorkshopContinueDrafting';
import { WorkshopContextRail } from './WorkshopContextRail';
import { WorkshopDocumentEditor } from './WorkshopDocumentEditor';
import { FormalizeDraftModal } from './FormalizeDraftModal';
import { buildWorkshopSyncSearch, shouldSyncWorkshopUrl } from './workshopNavigation';

interface WorkshopSectionProps {
  campaignHandle: string;
}

type WorkshopView = 'picker' | 'editor';

function liveLocationSearch(fallback: string): string {
  return typeof window !== 'undefined' ? window.location.search : fallback;
}

export function WorkshopSection({ campaignHandle }: WorkshopSectionProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const progressionBase = campaignProgressionPath(campaignHandle);

  const draftIdFromUrl = readWorkshopDraftIdFromSearch(location.search);
  const authoringContext = useMemo(
    () => parseAuthoringContextFromSearch(location.search),
    [location.search],
  );

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<WorkshopDocument[]>([]);
  const [activeDraft, setActiveDraft] = useState<WorkshopDocument | null>(null);
  const [view, setView] = useState<WorkshopView>('picker');
  const [titleDraft, setTitleDraft] = useState('');
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [formalizeOpen, setFormalizeOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [instrumentation, setInstrumentation] = useState<EditorInstrumentationState>({
    sessionWordDelta: 0,
    sessionDurationMs: 0,
    linksAdded: 0,
    isFocused: false,
    breakNudgeVisible: false,
    dismissBreakNudge: () => {},
  });

  const isActiveRef = useRef(true);
  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
    };
  }, []);

  const syncWorkshopUrl = useCallback(
    (draftId: string | null) => {
      const liveSearch = liveLocationSearch(location.search);
      if (!shouldSyncWorkshopUrl(liveSearch, isActiveRef.current)) return;

      const nextSearch = buildWorkshopSyncSearch(liveSearch, draftId);
      if (liveSearch === nextSearch) return;
      navigate(`${progressionBase}${nextSearch}`, { replace: true });
    },
    [location.search, navigate, progressionBase],
  );

  const syncWorkshopUrlRef = useRef(syncWorkshopUrl);
  syncWorkshopUrlRef.current = syncWorkshopUrl;

  const loadDrafts = useCallback(async () => {
    const list = await fetchWorkshopDrafts(campaignHandle, { status: 'active', limit: 50 });
    if (!isActiveRef.current) return list;
    setDrafts(list);
    return list;
  }, [campaignHandle]);

  const openDraft = useCallback(
    async (draftId: string, options?: { syncUrl?: boolean }) => {
      setBusy(true);
      try {
        const draft = await fetchWorkshopDraft(campaignHandle, draftId);
        if (!isActiveRef.current) return;
        setActiveDraft(draft);
        setTitleDraft(draft.title);
        setView('editor');
        if (options?.syncUrl !== false && draftIdFromUrl !== draftId) {
          syncWorkshopUrlRef.current(draftId);
        }
      } finally {
        if (isActiveRef.current) setBusy(false);
      }
    },
    [campaignHandle, draftIdFromUrl],
  );

  const anchorKey = authoringContext.anchorEntityIds?.join(',') ?? '';

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      try {
        const list = await loadDrafts();
        if (cancelled || !isActiveRef.current) return;

        if (draftIdFromUrl) {
          const draft = await fetchWorkshopDraft(campaignHandle, draftIdFromUrl);
          if (cancelled || !isActiveRef.current) return;
          setActiveDraft(draft);
          setTitleDraft(draft.title);
          setView('editor');
          return;
        }

        const anchorId = authoringContext.anchorEntityIds?.[0];
        if (anchorId) {
          const linked = list.find((d) => d.anchorEntityIds?.includes(anchorId));
          if (linked) {
            if (cancelled || !isActiveRef.current) return;
            setActiveDraft(linked);
            setTitleDraft(linked.title);
            setView('editor');
            if (!cancelled && isActiveRef.current) {
              syncWorkshopUrlRef.current(linked.id);
            }
            return;
          }
          const created = await createWorkshopDraft(campaignHandle, {
            anchorEntityIds: authoringContext.anchorEntityIds,
            sourceKind: authoringContext.kind,
          });
          if (cancelled || !isActiveRef.current) return;
          setDrafts((prev) => [created, ...prev]);
          setActiveDraft(created);
          setTitleDraft(created.title);
          setView('editor');
          if (!cancelled && isActiveRef.current) {
            syncWorkshopUrlRef.current(created.id);
          }
          return;
        }

        if (list.length === 0) {
          const created = await createWorkshopDraft(campaignHandle);
          if (cancelled || !isActiveRef.current) return;
          setDrafts([created]);
          setActiveDraft(created);
          setTitleDraft(created.title);
          setView('editor');
          if (!cancelled && isActiveRef.current) {
            syncWorkshopUrlRef.current(created.id);
          }
          return;
        }

        if (list.length === 1) {
          const only = list[0]!;
          if (cancelled || !isActiveRef.current) return;
          setActiveDraft(only);
          setTitleDraft(only.title);
          setView('editor');
          if (!cancelled && isActiveRef.current) {
            syncWorkshopUrlRef.current(only.id);
          }
          return;
        }

        setView('picker');
      } finally {
        if (!cancelled && isActiveRef.current) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [
    anchorKey,
    authoringContext.anchorEntityIds,
    authoringContext.kind,
    campaignHandle,
    draftIdFromUrl,
    loadDrafts,
  ]);

  const handleNewDraft = async () => {
    setBusy(true);
    try {
      const created = await createWorkshopDraft(campaignHandle);
      if (!isActiveRef.current) return;
      setDrafts((prev) => [created, ...prev]);
      setActiveDraft(created);
      setTitleDraft(created.title);
      setView('editor');
      syncWorkshopUrlRef.current(created.id);
    } finally {
      if (isActiveRef.current) setBusy(false);
    }
  };

  const handleTitleBlur = async () => {
    if (!activeDraft || titleDraft.trim() === activeDraft.title) return;
    const updated = await patchWorkshopDraft(campaignHandle, activeDraft.id, {
      title: titleDraft.trim() || 'Untitled',
    });
    if (!isActiveRef.current) return;
    setActiveDraft(updated);
    setDrafts((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const continuityNudge =
    activeDraft && countWikilinksInMarkdown(activeDraft.bodyMarkdown) >= 3
      ? `This draft references ${countWikilinksInMarkdown(activeDraft.bodyMarkdown)} linked entities.`
      : null;

  if (loading) {
    return <LoadingSpinner label="Opening workshop…" />;
  }

  if (view === 'picker') {
    return (
      <WorkshopContinueDrafting
        drafts={drafts}
        busy={busy}
        onSelectDraft={(id) => void openDraft(id)}
        onNewDraft={() => void handleNewDraft()}
        onResumeMostRecent={() => {
          const recent = drafts[0];
          if (recent) void openDraft(recent.id);
        }}
      />
    );
  }

  if (!activeDraft) {
    return <LoadingSpinner label="Loading draft…" />;
  }

  return (
    <div className="workshop-section relative -mx-1 min-h-[70vh]">
      <header className="mb-4 flex flex-wrap items-center gap-3 border-b border-border/30 pb-3">
        <input
          className="min-w-0 flex-1 bg-transparent text-lg font-medium text-foreground outline-none placeholder:text-muted-foreground"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => void handleTitleBlur()}
          aria-label="Draft title"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFormalizeOpen(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-primary/50"
          >
            Formalize
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOverflowOpen((v) => !v)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-elevated/60 hover:text-foreground"
              aria-label="Draft options"
            >
              <MoreHorizontal className="size-4" />
            </button>
            {overflowOpen ? (
              <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-border bg-surface py-1 text-xs shadow-lg">
                <button
                  type="button"
                  disabled={busy}
                  className="block w-full px-3 py-2 text-left hover:bg-elevated/60 disabled:opacity-60"
                  onClick={() => {
                    setOverflowOpen(false);
                    void handleNewDraft();
                  }}
                >
                  New draft
                </button>
                <button
                  type="button"
                  className="block w-full border-t border-border px-3 py-2 text-left hover:bg-elevated/60"
                  onClick={() => {
                    setOverflowOpen(false);
                    setActiveDraft(null);
                    setView('picker');
                    syncWorkshopUrlRef.current(null);
                  }}
                >
                  All drafts
                </button>
                <p className="border-t border-border px-3 py-2 text-muted-foreground">Unpublished</p>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <NarrativeLayout
        composition="studio"
        inlineContextual
        focal={
          <WorkshopDocumentEditor
            key={activeDraft.id}
            campaignHandle={campaignHandle}
            draft={activeDraft}
            onDraftUpdated={(updated) => {
              setActiveDraft(updated);
              setDrafts((prev) => {
                const next = prev.filter((d) => d.id !== updated.id);
                return [updated, ...next];
              });
            }}
            onInstrumentationChange={setInstrumentation}
          />
        }
        contextual={
          <WorkshopContextRail
            campaignHandle={campaignHandle}
            draft={activeDraft}
            collapsed={railCollapsed}
            onToggleCollapsed={() => setRailCollapsed((v) => !v)}
          />
        }
      />

      <WorkshopAmbientCorner
        recentDrafts={drafts}
        activeDraftId={activeDraft.id}
        onSelectDraft={(id) => void openDraft(id)}
        instrumentation={instrumentation}
        continuityNudge={continuityNudge}
      />

      <FormalizeDraftModal
        open={formalizeOpen}
        campaignHandle={campaignHandle}
        draft={activeDraft}
        onClose={() => setFormalizeOpen(false)}
        onFormalized={() => {
          void loadDrafts();
          setView('picker');
          setActiveDraft(null);
        }}
      />
    </div>
  );
}
