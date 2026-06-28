import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UserRoles } from '@/types/domain';
import type { User } from '@/types/campaign';
import { AccountMenuIdentity } from './AccountMenuIdentity';
import { CampaignSwitchPanel } from './CampaignSwitchPanel';

type AccountMenuPanel = 'primary' | 'switchCampaign';

interface AccountMenuProps {
  user: User;
  showAdminLink: boolean;
  activeCampaignId?: string;
  activeCampaignHandle?: string;
  onClose: () => void;
  onLogout: () => void;
  onCreateCampaign: () => void;
}

export function AccountMenu({
  user,
  showAdminLink,
  activeCampaignId,
  activeCampaignHandle,
  onClose,
  onLogout,
  onCreateCampaign,
}: AccountMenuProps) {
  const { t } = useTranslation();
  const [panel, setPanel] = useState<AccountMenuPanel>('primary');

  if (panel === 'switchCampaign') {
    return (
      <CampaignSwitchPanel
        activeCampaignId={activeCampaignId}
        activeCampaignHandle={activeCampaignHandle}
        onBack={() => setPanel('primary')}
        onClose={onClose}
        onCreateCampaign={onCreateCampaign}
      />
    );
  }

  const menuItemClass =
    'block w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-elevated';

  return (
    <div className="min-w-44">
      <AccountMenuIdentity user={user} />
      <div className="my-1 border-t border-border" />

      <button
        type="button"
        role="menuitem"
        onClick={() => setPanel('switchCampaign')}
        className={`${menuItemClass} flex items-center justify-between`}
      >
        <span>{t('accountMenu.switchCampaign')}</span>
        <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
      </button>

      <div className="my-1 border-t border-border" />

      <Link
        to={`/users/${user.id}`}
        role="menuitem"
        onClick={onClose}
        className={menuItemClass}
      >
        {t('accountMenu.profile')}
      </Link>
      <Link
        to="/settings"
        role="menuitem"
        onClick={onClose}
        className={menuItemClass}
      >
        {t('accountMenu.settings')}
      </Link>

      {showAdminLink && user.role === UserRoles.SYSTEM_ADMIN ? (
        <>
          <div className="my-1 border-t border-border" />
          <Link
            to="/admin/settings/general"
            role="menuitem"
            onClick={onClose}
            className={menuItemClass}
          >
            {t('accountMenu.administration')}
          </Link>
        </>
      ) : null}

      <div className="my-1 border-t border-border" />
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onClose();
          onLogout();
        }}
        className={menuItemClass}
      >
        {t('accountMenu.logOut')}
      </button>
    </div>
  );
}
