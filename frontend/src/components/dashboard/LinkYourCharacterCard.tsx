import { useMemo, useState } from 'react';
import { UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWiki } from '@/contexts/WikiContext';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { isCharacterWikiPage } from '@/lib/isCharacterWikiPage';
import { updateMemberIdentityPage } from '@/lib/campaignMemberIdentity';
import { CampaignMemberRoles } from '@/types/domain';

type LinkYourCharacterCardProps = {
  campaignHandle: string;
};

export function LinkYourCharacterCard({ campaignHandle }: LinkYourCharacterCardProps) {
  const { user } = useAuth();
  const { campaign, flatPages, players, refresh } = useWiki();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const characterPages = useMemo(
    () => flatPages.filter(isCharacterWikiPage),
    [flatPages],
  );

  const playerEntry = useMemo(
    () => (user?.id ? players.find((p) => p.id === user.id) : undefined),
    [players, user?.id],
  );

  const showCard =
    campaign?.role === CampaignMemberRoles.PARTICIPANT &&
    Boolean(user?.id) &&
    !playerEntry?.identityPageId;

  if (!showCard) return null;

  const handleChange = async (identityPageId: string | null) => {
    if (!user?.id) return;
    setSaving(true);
    setError(null);
    try {
      await updateMemberIdentityPage(campaignHandle, user.id, identityPageId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to link character.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-border/80 bg-surface/50 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <UserCircle className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Link your character</h2>
            <p className="mt-1 text-sm text-muted">
              Session notes, party views, journals, and mentions use this name once linked.
            </p>
          </div>
        </div>
        <div className="w-full min-w-0 sm:max-w-xs">
          <IdentityPagePicker
            flatPages={flatPages}
            defaultOptions={characterPages}
            searchOptions={flatPages}
            placeholder="Search character pages…"
            clearLabel="No character linked"
            value={null}
            disabled={saving}
            onChange={(pageId) => void handleChange(pageId)}
          />
        </div>
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
    </section>
  );
}
