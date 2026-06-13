import { Link } from 'react-router-dom';
import { EyeOff, User } from 'lucide-react';
import { MemberIdentityLabel } from '@/components/campaign/MemberIdentityLabel';
import { WikiMarkdown } from '@/components/wiki/WikiMarkdown';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import type { CombinedSessionNotesPayload } from '@/types/wiki';

interface SessionCombinedInlineViewProps {
  campaignHandle: string;
  payload: CombinedSessionNotesPayload;
  canManage: boolean;
}

export function SessionCombinedInlineView({
  campaignHandle,
  payload,
  canManage,
}: SessionCombinedInlineViewProps) {
  const { flatPages } = useWiki();
  const isDMUser =
    canManage;

  return (
    <div className="space-y-6">
      {payload.entitiesMentioned.length > 0 && (
        <section className="rounded-xl border border-border bg-surface/40 p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Entities mentioned tonight
          </h2>
          <div className="flex flex-wrap gap-2">
            {payload.entitiesMentioned.map((entity) => (
              <Link
                key={entity.pageId}
                to={campaignWikiPath(campaignHandle, entity.pageId, flatPages)}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {entity.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {payload.columns.map((column) => (
          <section
            key={column.userId}
            className={`flex min-h-40 flex-col rounded-xl border bg-background/60 ${
              column.masked
                ? 'border-dashed border-border opacity-80'
                : 'border-border'
            }`}
          >
            <header className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <User className="size-4 shrink-0 text-muted" aria-hidden />
                  <MemberIdentityLabel
                    source={column}
                    primaryClassName="truncate font-semibold text-foreground"
                  />
                </h3>
                <p className="text-[11px] text-muted">{column.role}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1">
                {column.isDmRole && (
                  <span className="rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-200">
                    DM
                  </span>
                )}
                {column.masked && (
                  <EyeOff
                    className="size-4 text-muted"
                    aria-label="Hidden from party"
                  />
                )}
              </span>
            </header>
            <div className="flex-1 overflow-y-auto p-4">
              {column.masked ? (
                <p className="text-sm italic text-muted">
                  {isDMUser
                    ? 'DM-only notes (hidden from players).'
                    : 'These notes are visible to the DM only.'}
                </p>
              ) : column.hasNotes ? (
                <div className="prose prose-invert max-w-none text-sm">
                  <WikiMarkdown content={column.markdown} />
                </div>
              ) : (
                <p className="text-sm text-muted">No notes logged for this session.</p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
