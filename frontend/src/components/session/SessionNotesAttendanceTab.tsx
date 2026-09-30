import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Check } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SessionNotesMemberIdentity } from '@/components/session/SessionNotesMemberIdentity';
import { useWiki } from '@/contexts/WikiContext';
import { campaignNotePath, campaignWikiPath } from '@/lib/campaignPaths';
import { fetchSessionNotesAttendance } from '@/lib/wiki';
import {
  META_TABLE_HEAD_CLASS,
  SURFACE_RECESSED_CLASS,
  SURFACE_SILENT_CLASS,
  TYPE_DISPLAY_CLASS,
  TYPE_META_CLASS,
} from '@/lib/surfaceLayout';
import type { SessionNotesAttendancePayload } from '@/types/wiki';

interface SessionNotesAttendanceTabProps {
  campaignHandle: string;
}

export function SessionNotesAttendanceTab({
  campaignHandle,
}: SessionNotesAttendanceTabProps) {
  const { t } = useTranslation();
  const { flatPages } = useWiki();
  const [data, setData] = useState<SessionNotesAttendancePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchSessionNotesAttendance(campaignHandle);
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : t('campaign.timeline.sessionNotesAttendanceLoadFailed'),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [campaignHandle, t]);

  if (loading) {
    return (
      <LoadingSpinner label={t('campaign.timeline.sessionNotesAttendanceLoading')} />
    );
  }
  if (error) {
    return <p className="text-sm text-red-300">{error}</p>;
  }
  if (!data) return null;

  if (data.sessions.length === 0) {
    return (
      <section className="rounded-xl border-2 border-dashed border-border p-8 text-center">
        <div className="mb-3 flex justify-center">
          <BookOpen className="size-8 text-muted" />
        </div>
        <h2 className={TYPE_DISPLAY_CLASS}>
          {t('campaign.timeline.sessionNotesAttendanceEmptyTitle')}
        </h2>
        <p className={`mt-2 ${SURFACE_RECESSED_CLASS}`}>
          {t('campaign.timeline.sessionNotesAttendanceEmptyBody')}
        </p>
      </section>
    );
  }

  return (
    <section className={`${SURFACE_SILENT_CLASS} overflow-hidden p-0`}>
      <div className="overflow-x-auto">
        <table className="operator-index-table w-full min-w-max">
          <thead>
            <tr className="border-b border-border bg-elevated/50">
              <th
                scope="col"
                className={`sticky left-0 z-10 bg-elevated/95 px-4 py-3 text-left ${META_TABLE_HEAD_CLASS}`}
              >
                {t('campaign.timeline.sessionNotesAttendanceSessionColumn')}
              </th>
              {data.members.map((member) => (
                <th
                  key={member.userId}
                  scope="col"
                  className="px-4 py-3 text-left align-bottom"
                >
                  <SessionNotesMemberIdentity
                    member={member}
                    campaignHandle={campaignHandle}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.sessions.map((session) => {
              const isCurrent =
                session.timelinePointId === data.currentTimelinePointId;
              return (
                <tr
                  key={session.timelinePointId}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={`border-b border-border/60 ${
                    isCurrent ? 'bg-primary/10' : ''
                  }`}
                >
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 px-4 py-3 text-left text-sm font-medium ${
                      isCurrent ? 'bg-primary/10' : 'bg-background'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Link
                        to={campaignNotePath(
                          campaignHandle,
                          session.timelinePointId,
                        )}
                        className="text-foreground hover:text-primary"
                      >
                        {session.title}
                      </Link>
                      {isCurrent ? (
                        <span className={`${TYPE_META_CLASS} text-xs text-primary`}>
                          {t('campaign.timeline.sessionNotesAttendanceCurrent')}
                        </span>
                      ) : null}
                    </div>
                  </th>
                  {data.members.map((member) => {
                    const cell = session.cells[member.userId] ?? {
                      pageId: null,
                      hasNotes: false,
                    };
                    return (
                      <td
                        key={member.userId}
                        className="px-4 py-3 text-center text-sm"
                      >
                        {cell.hasNotes ? (
                          cell.pageId ? (
                            <Link
                              to={campaignWikiPath(
                                campaignHandle,
                                cell.pageId,
                                flatPages,
                              )}
                              className="inline-flex text-primary hover:text-primary-hover"
                              aria-label={t(
                                'campaign.timeline.sessionNotesAttendanceHasNotes',
                              )}
                            >
                              <Check className="size-4" aria-hidden />
                            </Link>
                          ) : (
                            <span
                              className="inline-flex text-primary"
                              aria-label={t(
                                'campaign.timeline.sessionNotesAttendanceHasNotes',
                              )}
                            >
                              <Check className="size-4" aria-hidden />
                            </span>
                          )
                        ) : (
                          <span
                            className="text-muted"
                            aria-label={t(
                              'campaign.timeline.sessionNotesAttendanceNoNotes',
                            )}
                          >
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
