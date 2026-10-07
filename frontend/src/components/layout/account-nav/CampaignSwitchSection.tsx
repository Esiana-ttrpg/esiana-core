import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CampaignSwitchRecentRow } from './CampaignSwitchRecentRow';
import { useCampaignSwitchData } from './useCampaignSwitchData';

interface CampaignSwitchSectionProps {
  onClose: () => void;
  onCreateCampaign: () => void;
}

export function CampaignSwitchSection({
  onClose,
  onCreateCampaign,
}: CampaignSwitchSectionProps) {
  const { t } = useTranslation();
  const { recent, loading, loadError } = useCampaignSwitchData(true);

  function handleSelect() {
    onClose();
  }

  function handleCreate() {
    onClose();
    onCreateCampaign();
  }

  return (
    <div className="min-w-[20rem] max-w-[min(22rem,92vw)]">
      <div className="px-1">
        {loading ? (
          <p className="px-2 py-2 text-sm text-muted">{t('navigation.account.loadingCampaigns')}</p>
        ) : loadError ? (
          <p className="px-2 py-2 text-sm text-red-300">{t('navigation.account.loadError')}</p>
        ) : recent.length === 0 ? (
          <p className="px-2 py-2 text-sm text-muted">{t('navigation.account.noCampaigns')}</p>
        ) : (
          <div className="space-y-0.5">
            {recent.map((campaign) => (
              <CampaignSwitchRecentRow
                key={campaign.id}
                campaign={campaign}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between gap-2 px-1 pt-1">
        <Link
          to="/campaigns"
          role="menuitem"
          onClick={onClose}
          className="rounded-md px-2 py-2 text-sm text-muted transition-colors hover:bg-elevated hover:text-foreground"
        >
          {t('navigation.account.viewAllCampaigns')}
        </Link>
        <button
          type="button"
          role="menuitem"
          onClick={handleCreate}
          className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-elevated"
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          {t('navigation.account.createCampaign')}
        </button>
      </div>
    </div>
  );
}
