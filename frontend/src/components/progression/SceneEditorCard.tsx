import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import type { SceneHubNode } from '@/lib/adventure';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { parseSceneMetadata } from '@/lib/sceneMetadata';
import { updateSceneMetadata } from '@/lib/wiki';
import { SceneBeatChip } from '@/components/scene/SceneBeatChip';
import { SceneMetadataEditor } from '@/components/scene/SceneMetadataEditor';

interface SceneEditorCardProps {
  scene: SceneHubNode;
  campaignHandle: string;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onSaved?: () => void;
}

function LinkedEntityChips({ scene }: { scene: SceneHubNode }) {
  const chips: Array<{ id: string; label: string; kind: string }> = [];
  for (const quest of scene.references.quests.slice(0, 2)) {
    chips.push({ id: quest.id, label: quest.title, kind: 'Quest' });
  }
  for (const thread of scene.references.threads.slice(0, 2)) {
    chips.push({ id: thread.id, label: thread.title, kind: 'Thread' });
  }
  if (scene.references.location) {
    chips.push({
      id: scene.references.location.id,
      label: scene.references.location.title,
      kind: 'Location',
    });
  }
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex max-w-[10rem] truncate rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground"
          title={`${chip.kind}: ${chip.label}`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

export function SceneEditorCard({
  scene,
  campaignHandle,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  onSaved,
}: SceneEditorCardProps) {
  const { flatPages } = useWiki();
  const summaryId = useId();
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? internalExpanded;
  const [summaryDraft, setSummaryDraft] = useState(scene.scene.summary ?? '');
  const [metadata, setMetadata] = useState<Record<string, unknown>>(() => ({
    ...scene.scene,
  }));
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSummaryDraft(scene.scene.summary ?? '');
  }, [scene.id, scene.scene.summary]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  function setExpanded(next: boolean) {
    if (expanded === undefined) {
      setInternalExpanded(next);
    }
    onExpandedChange?.(next);
  }

  function scheduleSummarySave(value: string) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void updateSceneMetadata(campaignHandle, scene.id, {
        summary: value.trim() || null,
      }).then((result) => {
        setMetadata(result.metadata);
        onSaved?.();
      });
    }, 500);
  }

  const summaryPreview =
    summaryDraft.trim() ||
    scene.snippet?.trim() ||
    scene.scene.summary?.trim() ||
    'No summary yet';

  const statusLabel = scene.scene.sceneStatus;

  return (
    <article className="rounded-lg border border-border bg-card/80 shadow-sm">
      <button
        type="button"
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
        onClick={() => setExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls={`${summaryId}-panel`}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{scene.title}</h3>
            {scene.scene.beatType ? (
              <SceneBeatChip beatType={scene.scene.beatType} emphasis="inline" />
            ) : null}
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {statusLabel}
            </span>
            {scene.scene.narrativeWeight ? (
              <span className="text-[10px] text-muted-foreground">
                {scene.scene.narrativeWeight}
              </span>
            ) : null}
          </div>
          {!isExpanded ? (
            <>
              <LinkedEntityChips scene={scene} />
              <p className="line-clamp-1 text-xs text-muted-foreground">{summaryPreview}</p>
            </>
          ) : null}
        </div>
        <ChevronDown
          className={`size-4 shrink-0 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {isExpanded ? (
        <div id={`${summaryId}-panel`} className="space-y-3 border-t border-border px-3 py-3">
          <label className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Summary
            </span>
            <textarea
              value={summaryDraft}
              onChange={(event) => {
                setSummaryDraft(event.target.value);
                scheduleSummarySave(event.target.value);
              }}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary/60"
              placeholder="Lightweight scene notes…"
            />
          </label>

          <LinkedEntityChips scene={scene} />

          <SceneMetadataEditor
            campaignHandle={campaignHandle}
            pageId={scene.id}
            pageTitle={scene.title}
            metadata={metadata}
            flatPages={flatPages}
            bare
            onSaved={(next) => {
              setMetadata(next);
              setSummaryDraft(parseSceneMetadata(next).summary ?? '');
              onSaved?.();
            }}
          />

          <div className="flex justify-end pt-1">
            <Link
              to={campaignWikiPath(campaignHandle, scene.id, flatPages)}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open full page
              <ExternalLink className="size-3" aria-hidden />
            </Link>
          </div>
        </div>
      ) : null}
    </article>
  );
}
