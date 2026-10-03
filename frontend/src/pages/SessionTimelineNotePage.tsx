import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchCampaign } from '@/lib/campaigns';
import { readCampaignHandle } from '@/lib/campaignPaths';
import { ensureSessionAuthorNote } from '@/lib/wiki';
import { useSessionCombined } from '@/hooks/useSessionCombined';
import { SessionNoteEditor } from '@/components/session/SessionNoteEditor';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Toast } from '@/components/ui/Toast';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import { SessionTimeAdvanceModal } from '@/components/session/SessionTimeAdvanceModal';
import { ScheduleSessionModal } from '@/components/session/ScheduleSessionModal';
import { SkipSessionModal } from '@/components/session/SkipSessionModal';
import { PlannedWorldTimePrompt } from '@/components/session/PlannedWorldTimePrompt';
import { fetchCampaignSchedule } from '@/lib/campaignSchedule';
import { CampaignMemberRoles } from '@/types/domain';
import type { CampaignDetail } from '@/types/campaign';
import type { WikiPageLayoutPayload } from '@/types/wiki';
import type { UpcomingSessionSummary } from '@/types/notifications';

export function SessionTimelineNotePage() {
  const params = useParams<{ campaignHandle?: string; timelinePointId?: string }>();
  const campaignHandle = readCampaignHandle(params);
  const timelinePointId = params.timelinePointId ?? '';

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [pageData, setPageData] = useState<WikiPageLayoutPayload | null>(null);
  const [authorPageId, setAuthorPageId] = useState<string | null>(null);
  const [authorLoading, setAuthorLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingSessionSummary | null>(null);
  const [autoSchedule, setAutoSchedule] = useState(true);
  const [isOneShot, setIsOneShot] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [sessionScheduleStatus, setSessionScheduleStatus] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState<string | null>(null);
  const [plannedWorldEpochMinute, setPlannedWorldEpochMinute] = useState<string | null>(null);

  const {
    data: combined,
    loading: combinedLoading,
    refetch: refetchCombined,
  } = useSessionCombined(campaignHandle, { timelinePointId });

  const isDMUser =
    campaign?.role === CampaignMemberRoles.GAMEMASTER ||
    campaign?.role === CampaignMemberRoles.WRITER;

  useEffect(() => {
    if (!campaignHandle) return;
    void fetchCampaign(campaignHandle)
      .then(setCampaign)
      .catch(() => setCampaign(null));
  }, [campaignHandle]);

  useEffect(() => {
    if (!campaignHandle || !timelinePointId) return;

    let cancelled = false;
    setAuthorLoading(true);
    setError(null);

    void ensureSessionAuthorNote(campaignHandle, timelinePointId)
      .then((authorResult) => {
        if (cancelled) return;
        setAuthorPageId(authorResult.page.id);
        setPageData(authorResult.page);
      })
      .catch((err) => {
        if (cancelled) return;
        setPageData(null);
        setAuthorPageId(null);
        setError(err instanceof Error ? err.message : 'Unable to load session note.');
      })
      .finally(() => {
        if (!cancelled) setAuthorLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [campaignHandle, timelinePointId]);

  useEffect(() => {
    if (!campaignHandle || !timelinePointId) return;
    let cancelled = false;
    void fetchCampaignSchedule(campaignHandle)
      .then(async (payload) => {
        if (cancelled) return;
        setAutoSchedule(payload.schedule.autoScheduleUpcomingSession);
        setIsOneShot(payload.schedule.isOneShot);
        if (payload.upcoming?.timelinePointId === timelinePointId) {
          setUpcoming(payload.upcoming);
          setSessionScheduleStatus(payload.upcoming.status);
          setSkipReason(payload.upcoming.skipReason ?? null);
          setPlannedWorldEpochMinute(payload.upcoming.plannedWorldEpochMinute ?? null);
        } else {
          setUpcoming(
            payload.upcoming?.timelinePointId === timelinePointId ? payload.upcoming : null,
          );
          // Load this session's schedule for skip/planned world display
          const { fetchSessionSchedule } = await import('@/lib/notifications');
          const detail = await fetchSessionSchedule(campaignHandle, timelinePointId);
          if (cancelled) return;
          setSessionScheduleStatus(detail.schedule?.status ?? null);
          setSkipReason(detail.schedule?.skipReason ?? null);
          setPlannedWorldEpochMinute(detail.schedule?.plannedWorldEpochMinute ?? null);
          if (detail.schedule?.status === 'PUBLISHED' && detail.schedule.plannedStartAt) {
            const start = new Date(detail.schedule.plannedStartAt);
            if (start >= new Date()) {
              setUpcoming({
                ...detail.schedule,
                sessionTitle: detail.sessionTitle,
                sequenceOrder: detail.sequenceOrder,
              });
            }
          }
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle, timelinePointId]);

  const loading = authorLoading || (combinedLoading && !combined);
  const isSkipped = sessionScheduleStatus === 'SKIPPED';

  if (loading) {
    return <LoadingSpinner label="Opening session note…" />;
  }

  if (error || !pageData || !authorPageId) {
    return (
      <MascotErrorPanel
        code={404}
        title="Session note unavailable"
        description={error ?? 'This session note may have been removed or you may not have access.'}
      />
    );
  }

  return (
    <div className="space-y-4">
      {isSkipped ? (
        <p className="rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm text-muted">
          {skipReason?.trim() ? `Skipped · ${skipReason.trim()}` : 'Skipped'}
        </p>
      ) : null}

      {isDMUser ? (
        <div className="flex flex-wrap justify-end gap-2">
          {upcoming && !isSkipped ? (
            <>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(true)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface"
              >
                Edit schedule
              </button>
              <button
                type="button"
                onClick={() => setSkipModalOpen(true)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface"
              >
                Skip session
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => setShowEndSessionModal(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface"
          >
            End session
          </button>
        </div>
      ) : null}

      {isDMUser && plannedWorldEpochMinute && !isSkipped ? (
        <PlannedWorldTimePrompt
          campaignHandle={campaignHandle}
          timelinePointId={timelinePointId}
          plannedWorldEpochMinute={plannedWorldEpochMinute}
        />
      ) : null}

      <SessionTimeAdvanceModal
        open={showEndSessionModal}
        campaignHandle={campaignHandle}
        sessionDuration={campaign?.sessionDuration}
        onSkip={() => setShowEndSessionModal(false)}
        onAdvanced={() => {
          setShowEndSessionModal(false);
          setToastVisible(true);
          window.setTimeout(() => setToastVisible(false), 2500);
        }}
        onClose={() => setShowEndSessionModal(false)}
      />
      <Toast message="Campaign time advanced." visible={toastVisible} />

      <ScheduleSessionModal
        open={scheduleModalOpen}
        campaignHandle={campaignHandle}
        upcoming={upcoming}
        onClose={() => setScheduleModalOpen(false)}
        onSaved={() => {
          void refetchCombined();
        }}
      />

      {upcoming && !isSkipped ? (
        <SkipSessionModal
          open={skipModalOpen}
          campaignHandle={campaignHandle}
          upcoming={upcoming}
          autoScheduleDefault={autoSchedule}
          isOneShot={isOneShot}
          onClose={() => setSkipModalOpen(false)}
          onSkipped={() => {
            setSessionScheduleStatus('SKIPPED');
            void refetchCombined();
          }}
        />
      ) : null}

      <SessionNoteEditor
        campaignHandle={campaignHandle}
        pageId={authorPageId}
        pageData={pageData}
        timelinePointId={timelinePointId}
        combined={combined}
        combinedLoading={combinedLoading}
        onCombinedRefresh={() => void refetchCombined()}
        onPageUpdated={(patch) => {
          setPageData((prev) => (prev ? { ...prev, ...patch } : prev));
        }}
      />
    </div>
  );
}
