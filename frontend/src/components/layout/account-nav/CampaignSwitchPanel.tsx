import { Link } from 'react-router-dom';
import { ChevronLeft, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { resolveCampaignLinkHandle } from '@/lib/campaignPaths';
import { CampaignSwitchRecentRow } from './CampaignSwitchRecentRow';
import { CampaignSwitchRosterRow } from './CampaignSwitchRosterRow';
import { useCampaignSwitchData } from './useCampaignSwitchData';
import type { CampaignSummary } from '@/types/campaign';

interface CampaignSwitchPanelProps {
  activeCampaignId?: string;
  activeCampaignHandle?: string;
  onBack: () => void;
  onClose: () => void;
  onCreateCampaign: () => void;
}

function isActiveCampaign(
  campaign: CampaignSummary,
  activeCampaignId?: string,
  activeCampaignHandle?: string,
): boolean {
  if (activeCampaignId && campaign.id === activeCampaignId) return true;
  const slug = resolveCampaignLinkHandle(campaign);
  return Boolean(activeCampaignHandle && slug === activeCampaignHandle);
}

export function CampaignSwitchPanel({
  activeCampaignId,
  activeCampaignHandle,
  onBack,
  onClose,
  onCreateCampaign,
}: CampaignSwitchPanelProps) {
  const { t } = useTranslation();
  const { roster, recent, loading, loadError } = useCampaignSwitchData(true);

  function handleSelect() {
    onClose();
  }

  function handleCreate() {
    onClose();
    onCreateCampaign();
  }

  return (
    <div className="flex max-h-[min(70vh,32rem)] min-w-[20rem] max-w-[min(22rem,92vw)] flex-col">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 rounded-md px-2 py-2 text-sm text-muted transition-colors hover:bg-elevated hover:text-foreground"
      >
        <ChevronLeft className="size-4 shrink-0" aria-hidden />
        {t('navigation.account.switchCampaign')}
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto px-1">
        {loading ? (
          <p className="px-2 py-2 text-sm text-muted">{t('navigation.account.loadingCampaigns')}</p>
        ) : loadError ? (
          <p className="px-2 py-2 text-sm text-red-300">{t('navigation.account.loadError')}</p>
        ) : (
          <>
            {recent.length > 0 ? (
              <section className="mb-3">
                <p className={`px-2 pb-1 ${META_SECTION_LABEL_CLASS}`}>
                  {t('navigation.account.recent')}
                </p>
                <div className="space-y-0.5">
                  {recent.map((campaign) => (
                    <CampaignSwitchRecentRow
                      key={campaign.id}
                      campaign={campaign}
                      isCurrent={isActiveCampaign(
                        campaign,
                        activeCampaignId,
                        activeCampaignHandle,
                      )}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <Link
                to="/campaigns"
                role="menuitem"
                onClick={onClose}
                className={`block px-2 pb-1 transition-colors hover:text-foreground ${META_SECTION_LABEL_CLASS}`}
              >
                {t('navigation.account.yourCampaigns')}
              </Link>
              {roster.length === 0 ? (
                <p className="px-2 py-2 text-sm text-muted">{t('navigation.account.noCampaigns')}</p>
              ) : (
                <div className="space-y-0.5">
                  {roster.map((campaign) => (
                    <CampaignSwitchRosterRow
                      key={campaign.id}
                      campaign={campaign}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <div className="mt-1 border-t border-border/60 p-1">
        <button
          type="button"
          role="menuitem"
          onClick={handleCreate}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-elevated"
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          {t('navigation.account.createCampaign')}
        </button>
      </div>
    </div>
  );
}
