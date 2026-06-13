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
import { CampaignMemberRoles } from '@/types/domain';
import type { CampaignDetail } from '@/types/campaign';
import type { WikiPageLayoutPayload } from '@/types/wiki';

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

  const loading = authorLoading || (combinedLoading && !combined);

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
      {isDMUser ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowEndSessionModal(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface"
          >
            End session
          </button>
        </div>
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
