import { Loader2, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useId } from 'react';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { TiptapWidget } from '@/components/wiki/widgets/TiptapWidget';
import {
  QuestTimePressureEditor,
  QuestTimePressureSummary,
} from '@/components/quest/QuestTimePressureEditor';
import { EntityPageSection } from './EntityPageSection';
import {
  EntityFactReadValue,
  EntityFactRow,
  EntityFactRowList,
  EntityWikiInfobox,
  ENTITY_FACT_EDIT_FIELD_CLASS,
} from './EntityFactRow';
import { useQuestPageMetadata } from '@/hooks/useQuestPageMetadata';
import {
  buildQuestOverviewDisplayValues,
  QUEST_STATUSES,
  QUEST_TYPE_PRESETS,
} from '@/lib/questOverviewDisplay';
import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import {
  QUEST_LIFECYCLE_EDITOR_OPTIONS,
  questLifecycleDisplayLabel,
} from '@/lib/questLifecycleDisplay';
import type { NarrativeLifecycleState } from '@shared/narrativeLifecycle';
import {
  filterNpcPages,
  filterOrganizationPages,
} from '@/lib/questHubLayout';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
import type { EntityOverviewProps } from '@/lib/entityPageShells/types';
import type { WikiPageBlock } from '@/types/wiki';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

function findStoryBlock(blocks: WikiPageBlock[]): WikiPageBlock | undefined {
  return blocks.find((b) => b.type === 'text-tiptap');
}

export function QuestOverviewDashboard({
  campaignHandle,
  pageId,
  displayTitle,
  templateType,
  blocks,
  flatPages,
  isDMUser: isDMUserProp,
  isEditingPage,
  pageMetadata,
  discovery,
  pageTags,
  allCampaignTags,
  onPageTagsChange,
  onMetadataSaved,
  onBlocksChange,
  prosePrimary = false,
  pageVisibility,
  onVisibilityChange,
}: EntityOverviewProps & {
  pageVisibility: string;
  onVisibilityChange?: (next: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
}) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const canEdit = isEditingPage && isDMUser;
  const typeListId = useId();
  const storyBlock = findStoryBlock(blocks);
  const storyContent = (storyBlock?.content as Record<string, unknown>) ?? { markdown: '' };

  const questMeta = useQuestPageMetadata({
    campaignHandle,
    pageId,
    pageTitle: displayTitle,
    metadata: pageMetadata,
    pageTags,
    onPageTagsChange,
    onSaved: onMetadataSaved,
  });

  const {
    draft,
    lifecycleState,
    saving,
    error,
    timeTrackingAvailable,
    locationDraft,
    setLocationDraft,
    handleLifecycleChange,
    persist,
    persistMetadataField,
    handleReset,
    metadata,
  } = questMeta;

  const displayValues = useMemo(
    () =>
      buildQuestOverviewDisplayValues({
        pageMetadata,
        flatPages,
        campaignHandle,
        lifecycleState,
        isDMUser,
      }),
    [pageMetadata, flatPages, campaignHandle, lifecycleState, isDMUser],
  );

  const npcPages = filterNpcPages(flatPages);
  const orgPages = filterOrganizationPages(flatPages);

  function updateStoryContent(next: Record<string, unknown>) {
    if (!storyBlock) return;
    onBlocksChange((prev) =>
      prev.map((b) => (b.id === storyBlock.id ? { ...b, content: next } : b)),
    );
  }

  const identityEdit = (
    <EntityFactRowList>
      <EntityFactRow label="Quest type" fieldId="quest-field-type">
        <input
          type="text"
          list={typeListId}
          className={ENTITY_FACT_EDIT_FIELD_CLASS}
          disabled={saving}
          defaultValue={draft.questType ?? ''}
          onBlur={(e) => {
            const next = e.target.value.trim() || null;
            if (next === draft.questType) return;
            void persist({ questType: next });
          }}
          placeholder="Main, Side…"
        />
        <datalist id={typeListId}>
          {QUEST_TYPE_PRESETS.map((preset) => (
            <option key={preset} value={preset} />
          ))}
        </datalist>
      </EntityFactRow>
      <EntityFactRow label="Status" fieldId="quest-field-status">
        <select
          className={ENTITY_FACT_EDIT_FIELD_CLASS}
          disabled={saving}
          value={lifecycleState}
          onChange={(e) => {
            void handleLifecycleChange(e.target.value as NarrativeLifecycleState);
          }}
        >
          {QUEST_LIFECYCLE_EDITOR_OPTIONS.map((state) => (
            <option key={state} value={state}>
              {questLifecycleDisplayLabel(state)}
            </option>
          ))}
        </select>
      </EntityFactRow>
      <EntityFactRow label="Visibility" fieldId="quest-field-visibility">
        <span className="text-sm text-foreground">
          {pageVisibility.replace('_', ' ')}
        </span>
      </EntityFactRow>
    </EntityFactRowList>
  );

  const identityRead = (
    <EntityFactRowList>
      <EntityFactRow label="Quest type">
        <EntityFactReadValue value={displayValues.questType} />
      </EntityFactRow>
      <EntityFactRow label="Status">
        <EntityFactReadValue value={displayValues.narrativeStatus} />
      </EntityFactRow>
      <EntityFactRow label="Visibility">
        <EntityFactReadValue value={pageVisibility.replace('_', ' ')} />
      </EntityFactRow>
    </EntityFactRowList>
  );

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md bg-red-950/40 px-2 py-0.5 text-[11px] text-red-300">
          {error}
        </p>
      ) : null}
      {saving ? (
        <Loader2 className="ml-auto size-3.5 animate-spin text-muted" aria-hidden />
      ) : null}

      <EntityPageSection id="quest-identity" title="Identity" wikiFacts>
        <EntityWikiInfobox className="max-w-md">
          {canEdit ? identityEdit : identityRead}
        </EntityWikiInfobox>
      </EntityPageSection>

      <EntityPageSection id="quest-overview" title="Overview">
        {canEdit ? (
          <textarea
            className={`${fieldClass} min-h-[4.5rem] text-sm leading-relaxed`}
            rows={3}
            disabled={saving}
            value={draft.summary ?? ''}
            onChange={(e) =>
              questMeta.setDraft((prev) => ({
                ...prev,
                summary: e.target.value || null,
              }))
            }
            onBlur={() => void persist({ summary: draft.summary })}
            placeholder="A mysterious plague has begun spreading through the northern villages…"
          />
        ) : displayValues.summary ? (
          <p className="text-sm leading-relaxed text-foreground">{displayValues.summary}</p>
        ) : (
          <p className="text-sm text-muted">No summary yet.</p>
        )}
      </EntityPageSection>

      <EntityPageSection id="quest-description" title="Description" dominant>
        <p className="mb-2 text-xs text-muted">
          Describe the story, important context, and what makes this quest interesting.
        </p>
        <TiptapWidget
          content={storyContent}
          onChange={updateStoryContent}
          isEditingLayout={canEdit}
          prosePrimary={prosePrimary}
          templateType={templateType}
        />
      </EntityPageSection>

      <EntityPageSection id="quest-people-places" title="People & Places" wikiFacts>
        {canEdit ? (
          <EntityFactRowList>
            <EntityFactRow label="Quest giver">
              <IdentityPagePicker
                flatPages={npcPages}
                value={draft.questGiverId}
                disabled={saving}
                placeholder="Search characters…"
                onChange={(nextId) => void persist({ questGiverId: nextId })}
              />
            </EntityFactRow>
            <EntityFactRow label="Organization">
              <IdentityPagePicker
                flatPages={orgPages}
                value={draft.factionId}
                disabled={saving}
                placeholder="Search organizations…"
                onChange={(nextId) => void persist({ factionId: nextId })}
              />
            </EntityFactRow>
            <EntityFactRow label="Location">
              <input
                type="text"
                className={ENTITY_FACT_EDIT_FIELD_CLASS}
                disabled={saving}
                value={locationDraft}
                onChange={(e) => setLocationDraft(e.target.value)}
                onBlur={() => {
                  const next = locationDraft.trim();
                  void persistMetadataField('Location', next);
                }}
                placeholder="Where this quest unfolds…"
              />
            </EntityFactRow>
          </EntityFactRowList>
        ) : (
          <EntityFactRowList>
            <EntityFactRow label="Quest giver">
              {displayValues.questGiverHref ? (
                <Link
                  to={displayValues.questGiverHref}
                  className="text-sm text-primary hover:underline"
                >
                  {displayValues.questGiverTitle}
                </Link>
              ) : (
                <EntityFactReadValue value={displayValues.questGiverTitle} />
              )}
            </EntityFactRow>
            <EntityFactRow label="Organization">
              {displayValues.organizationHref ? (
                <Link
                  to={displayValues.organizationHref}
                  className="text-sm text-primary hover:underline"
                >
                  {displayValues.organizationTitle}
                </Link>
              ) : (
                <EntityFactReadValue value={displayValues.organizationTitle} />
              )}
            </EntityFactRow>
            <EntityFactRow label="Location">
              <EntityFactReadValue value={displayValues.location} />
            </EntityFactRow>
          </EntityFactRowList>
        )}
      </EntityPageSection>

      <EntityPageSection id="quest-time" title="Time & Consequences">
        {timeTrackingAvailable === false ? (
          <p className="text-sm text-muted">
            Connect campaign time tracking to enable deadlines.
          </p>
        ) : (
          <>
            <QuestTimePressureEditor
              campaignHandle={campaignHandle}
              pageId={pageId}
              metadata={metadata}
              onSaved={onMetadataSaved}
              narrativeLabels
            />
          </>
        )}
      </EntityPageSection>

      <EntityPageSection id="quest-rewards" title="Rewards">
        {canEdit ? (
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className={META_FIELD_LABEL_CLASS}>Public rewards</span>
              <textarea
                className={fieldClass}
                rows={2}
                disabled={saving}
                value={draft.rewardsText ?? ''}
                onChange={(e) =>
                  questMeta.setDraft((prev) => ({
                    ...prev,
                    rewardsText: e.target.value || null,
                  }))
                }
                onBlur={() => void persist({ rewardsText: draft.rewardsText })}
                placeholder="What the party can see…"
              />
            </label>
            {isDMUser ? (
              <label className="block space-y-1">
                <span className={META_FIELD_LABEL_CLASS}>Hidden rewards</span>
                <textarea
                  className={fieldClass}
                  rows={2}
                  disabled={saving}
                  value={draft.dmRewardsText ?? ''}
                  onChange={(e) =>
                    questMeta.setDraft((prev) => ({
                      ...prev,
                      dmRewardsText: e.target.value || null,
                    }))
                  }
                  onBlur={() => void persist({ dmRewardsText: draft.dmRewardsText })}
                  placeholder="Secrets for the DM…"
                />
              </label>
            ) : null}
            <details className="rounded border border-border/60 p-2">
              <summary className="cursor-pointer text-xs font-medium text-muted">
                Treasury reward
              </summary>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
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
                    onChange={(e) => {
                      const amount = Number.parseInt(e.target.value, 10);
                      questMeta.setDraft((prev) => ({
                        ...prev,
                        ledgerReward:
                          Number.isFinite(amount) && amount > 0
                            ? {
                                amount,
                                recipient: prev.ledgerReward?.recipient ?? 'party',
                                contributorPageId:
                                  prev.ledgerReward?.contributorPageId ?? null,
                              }
                            : null,
                      }));
                    }}
                    onBlur={() => void persist({ ledgerReward: draft.ledgerReward })}
                    placeholder="700"
                  />
                </label>
              </div>
            </details>
          </div>
        ) : (
          <EntityFactRowList>
            <EntityFactRow label="Public rewards">
              <EntityFactReadValue value={displayValues.publicRewards} />
            </EntityFactRow>
            {isDMUser ? (
              <EntityFactRow label="Hidden rewards">
                <EntityFactReadValue value={displayValues.hiddenRewards} />
              </EntityFactRow>
            ) : null}
            <EntityFactRow label="Treasury reward">
              <EntityFactReadValue value={displayValues.treasuryAmount} />
            </EntityFactRow>
          </EntityFactRowList>
        )}
      </EntityPageSection>

      {isDMUser ? (
        <EntityPageSection id="quest-gm-notes" title="GM Notes" dominant>
          {canEdit ? (
            <textarea
              className={`${fieldClass} min-h-[6rem] text-sm leading-relaxed`}
              rows={5}
              disabled={saving}
              value={draft.gmNotes ?? ''}
              onChange={(e) =>
                questMeta.setDraft((prev) => ({
                  ...prev,
                  gmNotes: e.target.value || null,
                }))
              }
              onBlur={() => void persist({ gmNotes: draft.gmNotes })}
              placeholder="Twists, encounter ideas, reminders…"
            />
          ) : (
            <EntityFactReadValue value={displayValues.gmNotes} />
          )}
        </EntityPageSection>
      ) : null}

      {isDMUser ? (
        <details className="rounded-lg border border-border/40 bg-surface/30 p-3">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted">
            Advanced
          </summary>
          <div className="mt-3 space-y-3">
            <label className="block space-y-1">
              <span className={META_FIELD_LABEL_CLASS}>Board status</span>
              <select
                className={fieldClass}
                disabled={saving || !canEdit}
                value={draft.questStatus}
                onChange={(e) => {
                  void persist({
                    questStatus: e.target.value as typeof draft.questStatus,
                  });
                }}
              >
                {QUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
            <QuestTimePressureSummary metadata={metadata} showDiagnostics />
            {canEdit ? (
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
          </div>
        </details>
      ) : null}
    </div>
  );
}
