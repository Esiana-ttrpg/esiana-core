import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchRecruitmentLobby } from '@/lib/campaigns';
import type { RecruitmentLobbyResponse } from '@/types/recruitment';
import { PageContainer, PagePanel } from '@/components/layout/PageContainer';
import { PageShell, SHOWCASE_MAX_WIDTH_CLASS } from '@/components/layout/PageShell';
import { useAuth } from '@/contexts/AuthContext';
import { ApplyToCampaignModal } from '@/components/hub/ApplyToCampaignModal';
import { RecruitmentHero } from '@/components/recruitment/RecruitmentHero';
import { RecruitmentPremise } from '@/components/recruitment/RecruitmentPremise';
import { RecruitmentBeforeYouApply } from '@/components/recruitment/RecruitmentBeforeYouApply';
import { RecruitmentHostSection } from '@/components/recruitment/RecruitmentHostSection';
import { RecruitmentSafetySection } from '@/components/recruitment/RecruitmentSafetySection';
import { RecruitmentContentWarnings } from '@/components/recruitment/RecruitmentContentWarnings';
import { RecruitmentSupportingDetails } from '@/components/recruitment/RecruitmentSupportingDetails';
import { RecruitmentSidebar } from '@/components/recruitment/RecruitmentSidebar';
import { RecruitmentBeforeApplyNote } from '@/components/recruitment/RecruitmentBeforeApplyNote';
import { isLobbyTableFull } from '@shared/recruitmentSeats';

export function RecruitmentLobbyPage() {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [data, setData] = useState<RecruitmentLobbyResponse | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!campaignHandle) return;
    void (async () => {
      const response = await fetchRecruitmentLobby(campaignHandle);
      setData(response);
    })();
  }, [campaignHandle]);

  if (!data) {
    return <p className="text-sm text-muted">Loading recruitment lobby...</p>;
  }

  const recruitment = data.campaign.recruitment;
  const isFull = isLobbyTableFull(recruitment.filledSeats, {
    maxSeats: recruitment.maxSeats,
    maxPlayers: recruitment.maxPlayers,
  });

  function handleRequestSeat() {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/settings');
      return;
    }
    setApplyOpen(true);
  }

  return (
    <PageContainer>
      <PageShell
        width="wide"
        className={`${SHOWCASE_MAX_WIDTH_CLASS} flex flex-col gap-6`}
      >
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-xs text-muted"
        >
          <Link to="/" className="transition-colors hover:text-foreground hover:underline">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            to="/recruitment"
            className="transition-colors hover:text-foreground hover:underline"
          >
            Recruitment
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-medium text-foreground">
            {data.campaign.name}
          </span>
        </nav>

        {applied ? (
          <PagePanel className="border border-emerald-600/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
            Your introduction was sent to the DM. They will review it soon.
          </PagePanel>
        ) : null}

        <RecruitmentHero campaign={data.campaign} />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <main className="min-w-0 space-y-0">
            <RecruitmentPremise campaign={data.campaign} />
            <RecruitmentBeforeYouApply documentation={data.documentation} />
            <RecruitmentBeforeApplyNote
              campaign={data.campaign}
              className="border-b border-border/60 pb-8 lg:hidden"
            />
            <RecruitmentHostSection host={data.campaign.host} />
            <RecruitmentContentWarnings contentWarnings={recruitment.contentWarnings} />
            <RecruitmentSafetySection safetyTools={recruitment.safetyTools} />
            <RecruitmentSupportingDetails recruitment={recruitment} />
          </main>

          <RecruitmentSidebar
            campaign={data.campaign}
            isFull={isFull}
            onRequestSeat={handleRequestSeat}
          />
        </div>
      </PageShell>

      <ApplyToCampaignModal
        campaignId={data.campaign.id}
        campaignName={data.campaign.name}
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onApplied={() => {
          setApplied(true);
          setApplyOpen(false);
        }}
      />
    </PageContainer>
  );
}
