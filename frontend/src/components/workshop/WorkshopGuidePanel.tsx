import { useEffect, useMemo, useState } from 'react';
import type { WorkshopDocument } from '@shared/workshopDocument';
import type { EditorInstrumentationState } from '@/hooks/useEditorInstrumentation';
import type { WikiTreeNode } from '@/types/wiki';
import { fetchWorkshopDrafts, fetchWorkshopWritingContext } from '@/lib/workshopDrafts';
import { workshopDraftDisplayLabel } from '@/lib/workshopFieldSchema';
import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';

interface WorkshopGuidePanelProps {
  campaignHandle: string;
  draft: WorkshopDocument | null;
  openDraftIds: string[];
  flatPages: WikiTreeNode[];
  anchorTitles: Record<string, string>;
  instrumentation: EditorInstrumentationState;
  onOpenDraft: (draftId: string) => void;
}

export function WorkshopGuidePanel({
  campaignHandle,
  draft,
  openDraftIds,
  flatPages,
  anchorTitles,
  instrumentation,
  onOpenDraft,
}: WorkshopGuidePanelProps) {
  const [recentDrafts, setRecentDrafts] = useState<WorkshopDocument[]>([]);
  const [hints, setHints] = useState<string[]>([]);

  useEffect(() => {
    void fetchWorkshopDrafts(campaignHandle, { status: 'active', limit: 12 }).then(setRecentDrafts);
  }, [campaignHandle, draft?.id]);

  useEffect(() => {
    if (!draft) {
      setHints([]);
      return;
    }
    let cancelled = false;
    void fetchWorkshopWritingContext(campaignHandle, draft.id).then((ctx) => {
      if (!cancelled) setHints(ctx.hints);
    });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle, draft?.id]);

  const lastDrafts = useMemo(() => {
    const open = new Set(openDraftIds);
    const seen = new Set<string>();
    return recentDrafts
      .filter((d) => {
        if (open.has(d.id) || seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      })
      .slice(0, 6);
  }, [openDraftIds, recentDrafts]);

  const wordCount = instrumentation.sessionWordDelta;

  return (
    <div className="flex h-full min-h-0 flex-col text-sm">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
        <section className="space-y-1.5">
          <h3 className={META_SECTION_LABEL_CLASS}>Last drafts</h3>
          {lastDrafts.length === 0 ? (
            <p className="text-xs text-muted-foreground">No other recent drafts.</p>
          ) : (
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {lastDrafts.map((d) => {
                const anchorTitle = d.anchorEntityIds?.[0]
                  ? anchorTitles[d.anchorEntityIds[0]]
                  : undefined;
                const label = workshopDraftDisplayLabel(d, { anchorTitle, flatPages });
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => onOpenDraft(d.id)}
                      className="max-w-full truncate text-left hover:text-primary"
                    >
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {hints.length > 0 ? (
          <section className="space-y-1.5">
            <h3 className={META_SECTION_LABEL_CLASS}>Continuity</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <section className="mt-auto shrink-0 space-y-1.5 border-t border-border/30 pt-3">
        <h3 className={META_SECTION_LABEL_CLASS}>Session</h3>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>{wordCount} words this session</li>
          <li>{Math.max(1, Math.round(wordCount / 200))} min read est.</li>
        </ul>
      </section>
    </div>
  );
}
