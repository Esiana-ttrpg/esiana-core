import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { WorkshopDocument } from '@shared/workshopDocument';
import type { WorkshopFormalizeTarget } from '@shared/workshopDocument';
import { useWiki } from '@/contexts/WikiContext';
import { useCampaignNav } from '@/contexts/CampaignNavContext';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
import type { EditorInstrumentationState } from '@/hooks/useEditorInstrumentation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  campaignCategoryChildPath,
  campaignWorkshopPath,
  resolveCanonicalPagePath,
} from '@/lib/campaignPaths';
import {
  addDraftToWorkshopSession,
  patchWorkshopSession,
  patchWorkshopTabSaveState,
  readWorkshopSession,
  removeDraftFromWorkshopSession,
  type WorkshopRailMode,
  type WorkshopTabSaveState,
} from '@/lib/workspacePersistence';
import {
  applyWorkshopDraft,
  bootstrapAnchoredWorkshopDraft,
  createWorkshopDraft,
  fetchWorkshopDraft,
  fetchWorkshopDrafts,
} from '@/lib/workshopDrafts';
import { fetchWikiPageLayout } from '@/lib/wiki';
import type { WikiPageLayoutPayload } from '@/types/wiki';
import {
  buildWorkshopSearch,
  readWorkshopDraftIdFromSearch,
  readWorkshopFromPageId,
  resolveLegacyWorkshopRedirect,
} from '@/lib/workshopNavigation';
import { resolveWorkshopFieldSchema } from '@/lib/workshopFieldSchema';
import { WorkshopDocumentEditor } from '@/components/workshop/WorkshopDocumentEditor';
import { WorkshopDocumentOutline } from '@/components/workshop/WorkshopDocumentOutline';
import { WorkshopDocumentTabs } from '@/components/workshop/WorkshopDocumentTabs';
import { WorkshopFieldsPanel } from '@/components/workshop/WorkshopFieldsPanel';
import { WorkshopGuidePanel } from '@/components/workshop/WorkshopGuidePanel';
import { WorkshopPageToolbar } from '@/components/workshop/WorkshopPageToolbar';
import { WorkshopRightRail } from '@/components/workshop/WorkshopRightRail';
import { WorkshopWritingShell } from '@/components/workshop/WorkshopWritingShell';
import { FormalizeDraftModal } from '@/components/workshop/FormalizeDraftModal';

export function WorkshopPage() {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { flatPages } = useWiki();
  const { setSidebarCollapsed } = useCampaignNav();
  const isStaff = useElevatedNarrativeView();

  const draftIdFromUrl = readWorkshopDraftIdFromSearch(location.search);
  const fromPageId = readWorkshopFromPageId(location.search);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [openDrafts, setOpenDrafts] = useState<WorkshopDocument[]>([]);
  const [activeDraft, setActiveDraft] = useState<WorkshopDocument | null>(null);
  const [anchorPages, setAnchorPages] = useState<Record<string, WikiPageLayoutPayload>>({});
  const [railMode, setRailMode] = useState<WorkshopRailMode>('guide');
  const [tabSaveStates, setTabSaveStates] = useState<Record<string, WorkshopTabSaveState>>({});
  const [editor, setEditor] = useState<Editor | null>(null);
  const [formalizeOpen, setFormalizeOpen] = useState(false);
  const [instrumentation, setInstrumentation] = useState<EditorInstrumentationState>({
    sessionWordDelta: 0,
    sessionDurationMs: 0,
    linksAdded: 0,
    isFocused: false,
    breakNudgeVisible: false,
    dismissBreakNudge: () => {},
  });

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const syncUrl = useCallback(
    (draftId: string | null, from?: string | null) => {
      const search = buildWorkshopSearch(draftId, from ?? fromPageId);
      navigate(`${campaignWorkshopPath(campaignHandle)}${search}`, { replace: true });
    },
    [campaignHandle, fromPageId, navigate],
  );

  const loadAnchorPage = useCallback(
    async (pageId: string) => {
      if (anchorPages[pageId]) return anchorPages[pageId];
      const page = await fetchWikiPageLayout(campaignHandle, pageId);
      setAnchorPages((prev) => ({ ...prev, [pageId]: page }));
      return page;
    },
    [anchorPages, campaignHandle],
  );

  const refreshOpenDrafts = useCallback(
    async (ids: string[]) => {
      const loaded = await Promise.all(
        ids.map((id) => fetchWorkshopDraft(campaignHandle, id).catch(() => null)),
      );
      return loaded.filter((d): d is WorkshopDocument => d !== null);
    },
    [campaignHandle],
  );

  const activateDraft = useCallback(
    async (draft: WorkshopDocument, options?: { sync?: boolean }) => {
      setActiveDraft(draft);
      addDraftToWorkshopSession(campaignHandle, draft.id);
      if (options?.sync !== false) {
        syncUrl(draft.id, fromPageId);
      }
      if (draft.binding === 'anchored' && draft.anchorEntityIds?.[0]) {
        await loadAnchorPage(draft.anchorEntityIds[0]);
      }
    },
    [campaignHandle, fromPageId, loadAnchorPage, syncUrl],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      try {
        const session = readWorkshopSession(campaignHandle);
        setRailMode(session.railMode ?? 'guide');
        setTabSaveStates(session.tabSaveStates ?? {});

        let draft: WorkshopDocument | null = null;

        if (fromPageId && !draftIdFromUrl) {
          draft = await bootstrapAnchoredWorkshopDraft(campaignHandle, {
            anchorPageId: fromPageId,
          });
        } else if (draftIdFromUrl) {
          draft = await fetchWorkshopDraft(campaignHandle, draftIdFromUrl);
        }

        const sessionIds = session.openDraftIds ?? [];
        const ids = draft
          ? [draft.id, ...sessionIds.filter((id) => id !== draft!.id)]
          : sessionIds;

        if (!ids.length && !draft) {
          const all = await fetchWorkshopDrafts(campaignHandle, { limit: 1 });
          if (all[0]) draft = all[0];
        }

        const finalIds = draft ? [draft.id, ...ids.filter((id) => id !== draft!.id)] : ids;
        const loaded = await refreshOpenDrafts(finalIds.slice(0, 8));
        if (cancelled) return;

        setOpenDrafts(loaded);
        const active = draft ?? loaded.find((d) => d.id === session.activeDraftId) ?? loaded[0] ?? null;
        if (active) {
          await activateDraft(active, { sync: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [activateDraft, campaignHandle, draftIdFromUrl, fromPageId, refreshOpenDrafts]);

  const handleProseSaveState = useCallback(
    (state: WorkshopTabSaveState['prose']) => {
      if (!activeDraft) return;
      patchWorkshopTabSaveState(campaignHandle, activeDraft.id, 'prose', state);
      setTabSaveStates((prev) => ({
        ...prev,
        [activeDraft.id]: {
          ...(prev[activeDraft.id] ?? { prose: 'idle', fields: 'idle' }),
          prose: state,
        },
      }));
    },
    [activeDraft, campaignHandle],
  );

  const handleFieldsSaveState = useCallback(
    (state: WorkshopTabSaveState['fields']) => {
      if (!activeDraft) return;
      patchWorkshopTabSaveState(campaignHandle, activeDraft.id, 'fields', state);
      setTabSaveStates((prev) => ({
        ...prev,
        [activeDraft.id]: {
          ...(prev[activeDraft.id] ?? { prose: 'idle', fields: 'idle' }),
          fields: state,
        },
      }));
    },
    [activeDraft, campaignHandle],
  );

  const handleDraftUpdated = useCallback((updated: WorkshopDocument) => {
    setActiveDraft(updated);
    setOpenDrafts((prev) => {
      const next = prev.filter((d) => d.id !== updated.id);
      return [updated, ...next];
    });
  }, []);

  const handleSelectTab = useCallback(
    async (draftId: string) => {
      const draft = openDrafts.find((d) => d.id === draftId);
      if (draft) {
        await activateDraft(draft);
        return;
      }
      const fetched = await fetchWorkshopDraft(campaignHandle, draftId);
      setOpenDrafts((prev) => [fetched, ...prev.filter((d) => d.id !== fetched.id)]);
      await activateDraft(fetched);
    },
    [activateDraft, campaignHandle, openDrafts],
  );

  const handleCloseTab = useCallback(
    (draftId: string) => {
      const nextSession = removeDraftFromWorkshopSession(campaignHandle, draftId);
      setOpenDrafts((prev) => prev.filter((d) => d.id !== draftId));
      if (activeDraft?.id === draftId) {
        const nextId = nextSession.activeDraftId ?? null;
        if (nextId) {
          void handleSelectTab(nextId);
        } else {
          setActiveDraft(null);
          syncUrl(null);
        }
      }
    },
    [activeDraft?.id, campaignHandle, handleSelectTab, syncUrl],
  );

  const handleCreate = useCallback(
    async (target: WorkshopFormalizeTarget | 'blank') => {
      setBusy(true);
      try {
        const created = await createWorkshopDraft(
          campaignHandle,
          target === 'blank'
            ? {}
            : { intendedTarget: target, title: undefined },
        );
        setOpenDrafts((prev) => [created, ...prev.filter((d) => d.id !== created.id)]);
        await activateDraft(created);
      } finally {
        setBusy(false);
      }
    },
    [activateDraft, campaignHandle],
  );

  const handleReturn = useCallback(() => {
    const anchorId = activeDraft?.anchorEntityIds?.[0] ?? fromPageId;
    if (!anchorId) return;
    const page = flatPages.find((p) => p.id === anchorId);
    if (page) {
      navigate(resolveCanonicalPagePath(campaignHandle, page, flatPages));
      return;
    }
    navigate(campaignCategoryChildPath(campaignHandle, anchorId, undefined, flatPages));
  }, [activeDraft, campaignHandle, flatPages, fromPageId, navigate]);

  const handleApply = useCallback(async () => {
    if (!activeDraft) return;
    setBusy(true);
    try {
      const updated = await applyWorkshopDraft(campaignHandle, activeDraft.id);
      handleDraftUpdated(updated);
    } finally {
      setBusy(false);
    }
  }, [activeDraft, campaignHandle, handleDraftUpdated]);

  const anchorPage = useMemo(() => {
    const id = activeDraft?.anchorEntityIds?.[0];
    return id ? anchorPages[id] ?? null : null;
  }, [activeDraft, anchorPages]);

  const fieldSchema = useMemo(() => {
    if (!activeDraft) return null;
    return resolveWorkshopFieldSchema({
      draft: activeDraft,
      anchorPage,
      flatPages,
      isDMUser: isStaff,
    });
  }, [activeDraft, anchorPage, flatPages, isStaff]);

  const anchorTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [id, page] of Object.entries(anchorPages)) {
      map[id] = page.title;
    }
    for (const p of flatPages) {
      map[p.id] = p.title;
    }
    return map;
  }, [anchorPages, flatPages]);

  const legacyRedirect = resolveLegacyWorkshopRedirect(campaignHandle, location.search);
  if (legacyRedirect) {
    return <Navigate to={legacyRedirect} replace />;
  }

  if (loading) {
    return <LoadingSpinner label="Opening workshop…" />;
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-2 py-3">
      <WorkshopWritingShell
        toolbar={
          <WorkshopPageToolbar
            canReturn={Boolean(activeDraft?.anchorEntityIds?.[0] ?? fromPageId)}
            canApply={activeDraft?.binding === 'anchored'}
            onReturn={handleReturn}
            onApply={() => void handleApply()}
            onCreate={(t) => void handleCreate(t)}
            onFormalize={isStaff && activeDraft ? () => setFormalizeOpen(true) : undefined}
            busy={busy}
          />
        }
        tabs={
          <WorkshopDocumentTabs
            drafts={openDrafts}
            activeDraftId={activeDraft?.id ?? null}
            tabSaveStates={tabSaveStates}
            anchorTitles={anchorTitles}
            flatPages={flatPages}
            onSelect={(id) => void handleSelectTab(id)}
            onClose={handleCloseTab}
            onAdd={() => void handleCreate('blank')}
          />
        }
        outline={<WorkshopDocumentOutline editor={editor} />}
        editor={
          activeDraft ? (
            <WorkshopDocumentEditor
              key={activeDraft.id}
              campaignHandle={campaignHandle}
              draft={activeDraft}
              onDraftUpdated={handleDraftUpdated}
              onInstrumentationChange={setInstrumentation}
              onProseSaveState={handleProseSaveState}
              onEditorReady={setEditor}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Open or create a draft to begin writing.</p>
          )
        }
        rightRail={
          <WorkshopRightRail
            mode={railMode}
            fieldsDisabled={!fieldSchema}
            onModeChange={(mode) => {
              setRailMode(mode);
              patchWorkshopSession(campaignHandle, {
                ...readWorkshopSession(campaignHandle),
                railMode: mode,
              });
            }}
            guidePanel={
              <WorkshopGuidePanel
                campaignHandle={campaignHandle}
                draft={activeDraft}
                openDraftIds={openDrafts.map((d) => d.id)}
                flatPages={flatPages}
                anchorTitles={anchorTitles}
                instrumentation={instrumentation}
                onOpenDraft={(id) => void handleSelectTab(id)}
              />
            }
            fieldsPanel={
              activeDraft ? (
                <WorkshopFieldsPanel
                  campaignHandle={campaignHandle}
                  draft={activeDraft}
                  schema={fieldSchema}
                  anchorPage={anchorPage}
                  onFieldsSaveState={handleFieldsSaveState}
                  onAnchorPageUpdated={(page) => {
                    const anchorId = activeDraft.anchorEntityIds?.[0];
                    if (anchorId) {
                      setAnchorPages((prev) => ({ ...prev, [anchorId]: page }));
                    }
                  }}
                  onDraftUpdated={handleDraftUpdated}
                />
              ) : null
            }
          />
        }
      />

      {activeDraft ? (
        <FormalizeDraftModal
          open={formalizeOpen}
          campaignHandle={campaignHandle}
          draft={activeDraft}
          onClose={() => setFormalizeOpen(false)}
          onFormalized={() => {
            setFormalizeOpen(false);
            void fetchWorkshopDrafts(campaignHandle).then(() => navigate(campaignWorkshopPath(campaignHandle)));
          }}
        />
      ) : null}
    </div>
  );
}
