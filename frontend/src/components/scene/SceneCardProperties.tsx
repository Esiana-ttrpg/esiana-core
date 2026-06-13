import { useMemo } from 'react';
import type { SceneMetadataFields, SceneStatus, SceneBeatType, SceneKind, SceneNarrativeWeight } from '@/lib/sceneMetadata';
import {
  SCENE_STATUSES,
  SCENE_BEAT_TYPES,
  SCENE_KINDS,
  SCENE_NARRATIVE_WEIGHTS,
} from '@/lib/sceneMetadata';
import { formatSceneBeatLabel, sceneBeatHint } from '@/lib/sceneBeatVisualTokens';
import { isObjectiveMetadataPresent } from '@/lib/objectiveMetadata';
import { allowedSceneStatusesForLifecycle } from '@shared/sceneLifecycleMatrix';
import {
  NarrativeLifecycleStates,
  type NarrativeLifecycleState,
} from '@shared/narrativeLifecycle';
import { PageIdListEditor } from '@/components/entity/codexMetadataEditorShared';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { SessionTimelineSelect } from '@/components/session/SessionTimelineSelect';
import { BranchConditionListEditor } from '@/components/narrative/BranchConditionListEditor';
import { SceneOutcomeListEditor } from '@/components/scene/SceneOutcomeListEditor';
import type { WikiTreeNode } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

const LIFECYCLE_OPTIONS: NarrativeLifecycleState[] = [
  NarrativeLifecycleStates.LOCKED,
  NarrativeLifecycleStates.DISCOVERED,
  NarrativeLifecycleStates.ACTIVE,
  NarrativeLifecycleStates.COMPLETED,
  NarrativeLifecycleStates.FAILED,
];

interface SceneCardPropertiesProps {
  scene: SceneMetadataFields;
  lifecycleState: NarrativeLifecycleState;
  flatPages: WikiTreeNode[];
  pageId: string;
  campaignHandle: string;
  disabled?: boolean;
  onScenePatch: (patch: Partial<SceneMetadataFields>) => Promise<void>;
  onLifecycleChange: (state: NarrativeLifecycleState) => Promise<void>;
}

export function SceneCardProperties({
  scene,
  lifecycleState,
  flatPages,
  pageId,
  campaignHandle,
  disabled = false,
  onScenePatch,
  onLifecycleChange,
}: SceneCardPropertiesProps) {
  const allowedStatuses = useMemo(
    () => allowedSceneStatusesForLifecycle(lifecycleState),
    [lifecycleState],
  );

  const pickerPages = useMemo(
    () => flatPages.filter((page) => page.id !== pageId),
    [flatPages, pageId],
  );

  const objectivePickerPages = useMemo(
    () =>
      flatPages.filter(
        (page) =>
          page.id !== pageId &&
          isObjectiveMetadataPresent(page.metadata) &&
          page.parentId != null &&
          scene.linkedQuestPageIds.includes(page.parentId),
      ),
    [flatPages, pageId, scene.linkedQuestPageIds],
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Status
          </span>
          <select
            className={fieldClass}
            disabled={disabled}
            value={scene.sceneStatus}
            onChange={(event) => {
              void onScenePatch({ sceneStatus: event.target.value as SceneStatus });
            }}
          >
            {SCENE_STATUSES.filter((status) => allowedStatuses.includes(status)).map(
              (status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="space-y-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Lifecycle
          </span>
          <select
            className={fieldClass}
            disabled={disabled}
            value={lifecycleState}
            onChange={(event) => {
              void onLifecycleChange(event.target.value as NarrativeLifecycleState);
            }}
          >
            {LIFECYCLE_OPTIONS.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Weight
          </span>
          <select
            className={fieldClass}
            disabled={disabled}
            value={scene.narrativeWeight}
            onChange={(event) => {
              void onScenePatch({
                narrativeWeight: event.target.value as SceneNarrativeWeight,
              });
            }}
          >
            {SCENE_NARRATIVE_WEIGHTS.map((weight) => (
              <option key={weight} value={weight}>
                {weight}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Beat
          </span>
          <select
            className={fieldClass}
            disabled={disabled}
            value={scene.beatType ?? ''}
            onChange={(event) => {
              void onScenePatch({
                beatType: (event.target.value || null) as SceneBeatType | null,
              });
            }}
          >
            <option value="">—</option>
            {SCENE_BEAT_TYPES.map((beat) => (
              <option key={beat} value={beat}>
                {formatSceneBeatLabel(beat) ?? beat}
              </option>
            ))}
          </select>
          {scene.beatType ? (
            <p className="text-[10px] text-muted">{sceneBeatHint(scene.beatType)}</p>
          ) : (
            <p className="text-[10px] text-muted">
              Structural dramatic role — use Tone for emotional color.
            </p>
          )}
        </label>

        <label className="space-y-0.5 sm:col-span-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Kind
          </span>
          <select
            className={fieldClass}
            disabled={disabled}
            value={scene.sceneKind ?? ''}
            onChange={(event) => {
              void onScenePatch({
                sceneKind: (event.target.value || null) as SceneKind | null,
              });
            }}
          >
            <option value="">—</option>
            {SCENE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block space-y-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Tone
          </span>
          <input
            type="text"
            className={fieldClass}
            disabled={disabled}
            value={scene.tone ?? ''}
            onChange={(event) => {
              void onScenePatch({ tone: event.target.value || null });
            }}
            placeholder="Tense, melancholic, triumphant…"
          />
        </label>

        <label className="block space-y-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Pacing tags
          </span>
          <input
            type="text"
            className={fieldClass}
            disabled={disabled}
            value={scene.pacingTags.join(', ')}
            onChange={(event) => {
              const pacingTags = event.target.value
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean);
              void onScenePatch({ pacingTags });
            }}
            placeholder="slow-burn, action, social, downtime"
          />
        </label>
      </div>

      <label className="block space-y-0.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
          Summary
        </span>
        <textarea
          className={`${fieldClass} min-h-[56px]`}
          disabled={disabled}
          value={scene.summary ?? ''}
          onChange={(event) => {
            void onScenePatch({ summary: event.target.value || null });
          }}
        />
      </label>

      <label className="block space-y-0.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
          GM notes
        </span>
        <textarea
          className={`${fieldClass} min-h-[56px]`}
          disabled={disabled}
          value={scene.gmNotes ?? ''}
          onChange={(event) => {
            void onScenePatch({ gmNotes: event.target.value || null });
          }}
        />
      </label>

      <BranchConditionListEditor
        label="Entry conditions"
        conditions={scene.entryConditions}
        flatPages={flatPages}
        disabled={disabled}
        onChange={(entryConditions) => {
          void onScenePatch({ entryConditions });
        }}
      />

      <BranchConditionListEditor
        label="Exit conditions"
        conditions={scene.exitConditions}
        flatPages={flatPages}
        disabled={disabled}
        onChange={(exitConditions) => {
          void onScenePatch({ exitConditions });
        }}
      />

      <SceneOutcomeListEditor
        outcomes={scene.outcomes}
        flatPages={flatPages}
        pickerPages={pickerPages}
        disabled={disabled}
        onChange={(outcomes) => {
          void onScenePatch({ outcomes });
        }}
      />

      <div className="space-y-0.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
          Location
        </span>
        <IdentityPagePicker
          flatPages={pickerPages}
          value={scene.locationPageId}
          disabled={disabled}
          placeholder="Optional location…"
          onChange={(locationPageId) => {
            void onScenePatch({ locationPageId });
          }}
        />
      </div>

      <PageIdListEditor
        label="Linked quests"
        ids={scene.linkedQuestPageIds}
        pickerPages={pickerPages}
        flatPages={flatPages}
        placeholder="Link quest pages…"
        onChange={(linkedQuestPageIds) => {
          void onScenePatch({ linkedQuestPageIds });
        }}
      />

      <PageIdListEditor
        label="Objectives this scene advances"
        ids={scene.linkedObjectivePageIds ?? []}
        pickerPages={objectivePickerPages}
        flatPages={flatPages}
        placeholder="Associate objectives…"
        onChange={(linkedObjectivePageIds) => {
          void onScenePatch({ linkedObjectivePageIds });
        }}
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="space-y-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Planned session
          </span>
          <SessionTimelineSelect
            campaignHandle={campaignHandle}
            value={scene.plannedSessionId}
            disabled={disabled}
            placeholder="Unscheduled"
            onChange={(plannedSessionId) => {
              void onScenePatch({ plannedSessionId });
            }}
          />
        </label>

        <label className="space-y-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Played session
          </span>
          <SessionTimelineSelect
            campaignHandle={campaignHandle}
            value={scene.playedSessionId}
            disabled={disabled}
            placeholder="Not played yet"
            onChange={(playedSessionId) => {
              void onScenePatch({ playedSessionId });
            }}
          />
        </label>
      </div>

      <PageIdListEditor
        label="Preceding scenes (sequence)"
        ids={scene.followsScenePageIds}
        pickerPages={pickerPages}
        flatPages={flatPages}
        placeholder="SCENE_FOLLOWS targets…"
        onChange={(followsScenePageIds) => {
          void onScenePatch({ followsScenePageIds });
        }}
      />

      <PageIdListEditor
        label="Linked clues"
        ids={scene.linkedCluePageIds}
        pickerPages={pickerPages}
        flatPages={flatPages}
        placeholder="Link clue threads…"
        onChange={(linkedCluePageIds) => {
          void onScenePatch({ linkedCluePageIds });
        }}
      />

      <PageIdListEditor
        label="Linked threads"
        ids={scene.linkedThreadPageIds}
        pickerPages={pickerPages}
        flatPages={flatPages}
        placeholder="Link narrative threads…"
        onChange={(linkedThreadPageIds) => {
          void onScenePatch({ linkedThreadPageIds });
        }}
      />

      <PageIdListEditor
        label="Participants"
        ids={scene.participantPageIds}
        pickerPages={pickerPages}
        flatPages={flatPages}
        placeholder="NPCs, PCs, factions…"
        onChange={(participantPageIds) => {
          void onScenePatch({ participantPageIds });
        }}
      />
    </div>
  );
}
