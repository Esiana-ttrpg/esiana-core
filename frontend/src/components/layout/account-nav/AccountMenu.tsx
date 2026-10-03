import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserRoles } from '@/types/domain';
import type { User } from '@/types/campaign';
import { AccountMenuIdentity } from './AccountMenuIdentity';
import { CampaignSwitchSection } from './CampaignSwitchSection';

interface AccountMenuProps {
  user: User;
  showAdminLink: boolean;
  onClose: () => void;
  onLogout: () => void;
  onCreateCampaign: () => void;
}

export function AccountMenu({
  user,
  showAdminLink,
  onClose,
  onLogout,
  onCreateCampaign,
}: AccountMenuProps) {
  const { t } = useTranslation();

  const menuItemClass =
    'block w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-elevated';

  return (
    <div className="min-w-44">
      <AccountMenuIdentity user={user} />
      <div className="my-1 border-t border-border" />

      <CampaignSwitchSection
        onClose={onClose}
        onCreateCampaign={onCreateCampaign}
      />

      <div className="my-1 border-t border-border" />

      <Link
        to="/characters"
        role="menuitem"
        onClick={onClose}
        className={menuItemClass}
      >
        {t('navigation.account.characters')}
      </Link>
      <Link
        to="/schedule"
        role="menuitem"
        onClick={onClose}
        className={menuItemClass}
      >
        {t('navigation.account.schedule')}
      </Link>

      <div className="my-1 border-t border-border" />

      <Link
        to={`/users/${user.id}`}
        role="menuitem"
        onClick={onClose}
        className={menuItemClass}
      >
        {t('navigation.account.profile')}
      </Link>
      <Link
        to="/settings"
        role="menuitem"
        onClick={onClose}
        className={menuItemClass}
      >
        {t('navigation.account.settings')}
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
            {t('navigation.account.administration')}
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
        {t('navigation.account.logOut')}
      </button>
    </div>
  );
}
