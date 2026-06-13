import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TagIcon } from '@/components/wiki/TagIcon';
import { tagChipStyle } from '@/lib/resolveTagIcon';
import { formatQuestDateLabel } from '@/lib/chronologyCalendar';
import { campaignWikiTagsPath } from '@/lib/campaignPaths';
import type { QuestMetadataFields } from '@/lib/questMetadata';
import type { FantasyCalendarLike } from '@/lib/timeEngine';
import type { QuestHubTagSummary, QuestReferenceSummary } from '@/types/wiki';

interface QuestCardPropertySummaryProps {
  quest: QuestMetadataFields;
  location: string | null;
  progressNote: string | null;
  references: {
    questGiver?: QuestReferenceSummary | null;
    faction?: QuestReferenceSummary | null;
  };
  calendarLike: FantasyCalendarLike | null;
  /** List view shows date beside the title instead. */
  hideDate?: boolean;
  /** Kanban cards use tighter spacing and typography. */
  compact?: boolean;
}

interface QuestCardTagsProps {
  campaignHandle: string;
  tagsPageId: string | null;
  tags: QuestHubTagSummary[];
}

function PropertyRow({
  label,
  compact,
  children,
}: {
  label: string;
  compact: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={
        compact
          ? 'flex min-w-0 items-baseline gap-1 text-[10px] leading-snug'
          : 'flex min-w-0 items-baseline gap-1.5 text-[11px] leading-snug'
      }
    >
      <span className="shrink-0 text-muted">{label}</span>
      <span className="min-w-0 text-foreground">{children}</span>
    </div>
  );
}

const referenceLinkClass = 'font-medium text-primary hover:underline';

export function QuestCardTags({
  campaignHandle,
  tagsPageId,
  tags,
}: QuestCardTagsProps) {
  if (tags.length === 0) return null;

  const chipClass =
    'inline-flex max-w-[5.5rem] items-center gap-0.5 truncate rounded border border-border/70 bg-background/60 px-1 py-px text-[9px] leading-tight text-muted transition-colors hover:border-primary/40 hover:text-foreground';

  return (
    <div className="inline-flex max-w-full flex-wrap justify-end gap-0.5 rounded-md border border-border/60 bg-elevated/25 p-0.5">
      {tags.map((tag) => {
        const chipStyle = tagChipStyle(tag.color ?? null);
        const content = (
          <>
            <TagIcon
              name={tag.name}
              icon={tag.icon}
              iconAssetUrl={tag.iconAssetUrl}
              className="size-2 shrink-0"
            />
            <span className="truncate">{tag.label}</span>
          </>
        );

        if (tagsPageId && tag.id) {
          return (
            <Link
              key={tag.id || tag.name}
              to={campaignWikiTagsPath(campaignHandle, tagsPageId, tag.id)}
              className={chipClass}
              style={chipStyle}
              title={tag.label}
            >
              {content}
            </Link>
          );
        }

        return (
          <span
            key={tag.id || tag.name}
            className={chipClass}
            style={chipStyle}
            title={tag.label}
          >
            {content}
          </span>
        );
      })}
    </div>
  );
}

export function QuestCardPropertySummary({
  quest,
  location,
  progressNote,
  references,
  calendarLike,
  hideDate = false,
  compact = false,
}: QuestCardPropertySummaryProps) {
  const dateLabel =
    !hideDate && calendarLike != null
      ? formatQuestDateLabel(quest.questDate, calendarLike)
      : null;

  const hasType = Boolean(quest.questType?.trim());
  const hasDate = Boolean(dateLabel);
  const hasLocation = Boolean(location?.trim());
  const hasProgressNote = Boolean(progressNote?.trim());
  const hasQuestGiver = Boolean(references.questGiver);
  const hasFaction = Boolean(references.faction);

  if (
    !hasType &&
    !hasDate &&
    !hasLocation &&
    !hasProgressNote &&
    !hasQuestGiver &&
    !hasFaction
  ) {
    return null;
  }

  return (
    <div className={compact ? 'mt-1.5 space-y-0.5' : 'mt-2 space-y-1'}>
      {hasType && (
        <PropertyRow label="Type:" compact={compact}>
          {quest.questType}
        </PropertyRow>
      )}
      {hasDate && (
        <PropertyRow label="Date:" compact={compact}>
          {dateLabel}
        </PropertyRow>
      )}
      {hasLocation && (
        <PropertyRow label="Location:" compact={compact}>
          {location}
        </PropertyRow>
      )}
      {hasProgressNote && (
        <PropertyRow label="Progress:" compact={compact}>
          {progressNote}
        </PropertyRow>
      )}
      {hasQuestGiver && references.questGiver && (
        <PropertyRow label="Quest giver:" compact={compact}>
          <Link
            to={references.questGiver.href}
            className={referenceLinkClass}
          >
            {references.questGiver.title}
          </Link>
        </PropertyRow>
      )}
      {hasFaction && references.faction && (
        <PropertyRow label="Faction:" compact={compact}>
          <Link
            to={references.faction.href}
            className={referenceLinkClass}
          >
            {references.faction.title}
          </Link>
        </PropertyRow>
      )}
    </div>
  );
}
