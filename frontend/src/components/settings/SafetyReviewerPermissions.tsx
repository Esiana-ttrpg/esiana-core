import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@/lib/api';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignCapabilities as C } from '@shared/campaignPolicy/capabilities';
import type { CampaignRoleCapabilityOverrideRow } from '@shared/campaignPolicy/capabilityOverrides';
import { secondaryButtonClasses } from '@/components/ui/formStyles';
const roles = ['GAMEMASTER', 'WRITER', 'PARTICIPANT', 'OBSERVER'] as const;
export function SafetyReviewerPermissions({ campaignHandle }: { campaignHandle: string }) {
  const { t } = useTranslation();
  const { can, refresh } = useWiki();
  const allowed = can(C.CAMPAIGN_MANAGE_ROLES);
  const [grants, setGrants] = useState<string[] | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false);
  const endpoint = '/campaigns/' + encodeURIComponent(campaignHandle) + '/capability-overrides';
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    void apiFetch<{ overrides: CampaignRoleCapabilityOverrideRow[] }>(endpoint)
      .then(data => { if (active) setGrants(data.overrides.filter(r => r.capability === C.SAFETY_MANAGE && r.effect === 'GRANT').map(r => r.role)); })
      .catch(e => active && setError(e.message));
    return () => { active = false; };
  }, [allowed, endpoint]);
  if (!allowed) return null;
  return <details className="space-y-3"><summary>{t('profile.safety.reviewerPermissions')}</summary>
    <p className="text-sm text-muted">{t('profile.safety.reviewerPermissionsHelp')}</p>
    {error && <p role="alert">{error}</p>}
    <form className="space-y-3" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError(''); setSaved(false);
      try {
        const current = await apiFetch<{ overrides: CampaignRoleCapabilityOverrideRow[] }>(endpoint);
        await apiFetch(endpoint, { method: 'PUT', body: JSON.stringify({ overrides: [
          ...current.overrides.filter(r => r.capability !== C.SAFETY_MANAGE),
          ...(grants ?? []).map(role => ({ role, capability: C.SAFETY_MANAGE, effect: 'GRANT' })),
        ] }) });
        await refresh(); setSaved(true);
      } catch (e) { setError(e instanceof Error ? e.message : t('profile.safety.failed')); }
      finally { setBusy(false); }
    }}>
      {roles.map(role => <label className="flex items-center gap-2" key={role}><input type="checkbox" disabled={busy || grants === null} checked={grants?.includes(role) ?? false} onChange={e => { setSaved(false); setGrants(current => e.target.checked ? [...(current ?? []), role] : (current ?? []).filter(r => r !== role)); }} />{t('profile.safety.role' + role)}</label>)}
      <button disabled={busy || grants === null} className={secondaryButtonClasses}>{t('profile.safety.saveReviewers')}</button>
      {saved && <p role="status">{t('profile.safety.reviewersSaved')}</p>}
    </form>
  </details>;
}
