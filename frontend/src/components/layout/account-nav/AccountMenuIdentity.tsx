import { getUserDisplayName } from '@/utils/userDisplayName';
import type { User } from '@/types/campaign';

interface AccountMenuIdentityProps {
  user: User;
}

export function AccountMenuIdentity({ user }: AccountMenuIdentityProps) {
  const loginLine = user.email?.trim() || user.username?.trim() || '';

  return (
    <div className="px-3 py-2">
      <p className="truncate text-sm font-medium text-foreground">
        {getUserDisplayName(user)}
      </p>
      {loginLine ? (
        <p className="truncate text-xs text-muted">{loginLine}</p>
      ) : null}
    </div>
  );
}
