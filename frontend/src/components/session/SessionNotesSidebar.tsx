import { Eye, EyeOff, LayoutGrid, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MemberIdentityLabel } from '@/components/campaign/MemberIdentityLabel';
import { ReferencesWidget } from '@/components/wiki/widgets/ReferencesWidget';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { campaignNoteAllViewPath } from '@/lib/campaignPaths';
import { SESSION_COMBINED_VIEW_ID } from '@/utils/sessionNoteConstants';
import type {
  CombinedSessionNotesPayload,
  SessionNotePerspectiveEntry,
} from '@/types/wiki';

interface SessionNotesSidebarProps {
  campaignHandle: string;
  timelinePointId: string | null;
  combined: CombinedSessionNotesPayload | null;
  roster: SessionNotePerspectiveEntry[];
  rosterLoading: boolean;
  activeUserId: string | null;
  onSelectMember: (entry: SessionNotePerspectiveEntry) => void;
  onSelectCombined?: () => void;
  showAllViewLink?: boolean;
  onAggregateRefresh?: () => void;
}

export function SessionNotesSidebar({
  campaignHandle,
  timelinePointId,
  combined,
  roster,
  rosterLoading,
  activeUserId,
  onSelectMember,
  onSelectCombined,
  showAllViewLink = true,
  onAggregateRefresh,
}: SessionNotesSidebarProps) {
  const allViewHref =
    showAllViewLink && timelinePointId && campaignHandle
      ? campaignNoteAllViewPath(campaignHandle, timelinePointId)
      : null;

  const isCombinedActive = activeUserId === SESSION_COMBINED_VIEW_ID;

  return (
    <aside className="flex min-h-0 flex-col gap-4">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Session notes
        </h2>
        <button
          type="button"
          onClick={() => onSelectCombined?.()}
          className={`mb-2 flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition-all ${
            isCombinedActive
              ? 'border-primary bg-primary/10'
              : 'cursor-pointer border-border bg-surface hover:border-primary/50'
          }`}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <LayoutGrid className="size-4 shrink-0 text-primary" aria-hidden />
            All Players
          </span>
          <span className="text-[11px] text-muted">Combined notes for this session</span>
        </button>
        {allViewHref && (
          <Link
            to={allViewHref}
            className="mb-3 block text-center text-[11px] text-primary hover:underline"
          >
            Open full grid / snapshot
          </Link>
        )}
        {rosterLoading ? (
          <LoadingSpinner label="Loading roster…" />
        ) : (
          <div className="flex flex-col gap-2">
            {roster.map((member) => {
              const isActive = member.id === activeUserId;
              const showMasked = member.masked && !member.hasNotes;
              return (
                <button
                  key={member.id}
                  type="button"
                  disabled={showMasked && !member.pageId}
                  onClick={() => onSelectMember(member)}
                  className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-all ${
                    isActive
                      ? 'border-primary bg-primary/10'
                      : member.hasNotes || member.pageId
                        ? 'cursor-pointer border-border bg-surface hover:border-primary/50'
                        : 'cursor-default border-border bg-background/40 opacity-60'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <User className="size-3.5 shrink-0 text-muted" aria-hidden />
                      <MemberIdentityLabel
                        source={member}
                        primaryClassName="text-sm text-foreground"
                      />
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1">
                      {member.isDmRole && (
                        <span className="rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
                          DM
                        </span>
                      )}
                      {member.masked ? (
                        <EyeOff
                          className="size-3.5 text-muted"
                          aria-label="Hidden from party"
                        />
                      ) : member.hasNotes ? (
                        <Eye className="size-3.5 text-primary" aria-hidden />
                      ) : null}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted">
                    {member.masked
                      ? 'Hidden from party'
                      : member.hasNotes
                        ? 'Has notes'
                        : 'No notes yet'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {combined ? (
        <div className="border-t border-border pt-4">
          <ReferencesWidget
            key={combined.referenceSourcePageIds.join(',')}
            campaignHandle={campaignHandle}
            aggregateReferences={combined.references}
            onAggregateRefresh={onAggregateRefresh}
            content={{}}
            onChange={() => {}}
            isEditingLayout={false}
          />
        </div>
      ) : rosterLoading ? (
        <div className="border-t border-border pt-4">
          <LoadingSpinner label="Loading references…" />
        </div>
      ) : null}
    </aside>
  );
}
