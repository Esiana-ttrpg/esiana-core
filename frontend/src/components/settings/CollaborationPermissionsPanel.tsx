import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { CampaignMemberRoles } from '@/types/domain';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import {
  CapabilityOverrideEffect,
  normalizeCapabilityOverrides,
  resolveRoleCapability,
  type CampaignRoleCapabilityOverrideRow,
} from '@shared/campaignPolicy/capabilityOverrides';
import { MembershipRoles } from '@shared/campaignPolicy/membershipRoles';

type OverrideRow = CampaignRoleCapabilityOverrideRow;

const COLLAB_ROLES = [
  CampaignMemberRoles.PARTICIPANT,
  CampaignMemberRoles.OBSERVER,
] as const;

const OVERRIDE_CAPS = [
  CampaignCapabilities.PAGE_CREATE,
  CampaignCapabilities.PAGE_EDIT_OWNED,
  CampaignCapabilities.PAGE_EDIT_PARTY,
  CampaignCapabilities.QUEST_EDIT,
  CampaignCapabilities.THREAD_EDIT,
  CampaignCapabilities.ASSETS_UPLOAD,
] as const;

const CAP_LABELS: Record<string, string> = {
  [CampaignCapabilities.PAGE_CREATE]: 'Create pages',
  [CampaignCapabilities.PAGE_EDIT_OWNED]: 'Edit own pages',
  [CampaignCapabilities.PAGE_EDIT_PARTY]: 'Edit party pages',
  [CampaignCapabilities.QUEST_EDIT]: 'Edit quests',
  [CampaignCapabilities.THREAD_EDIT]: 'Edit threads',
  [CampaignCapabilities.ASSETS_UPLOAD]: 'Upload assets',
  [CampaignCapabilities.CHRONOLOGY_EDIT]: 'Manage chronology events',
};

const MATRIX_ROWS = [
  ...OVERRIDE_CAPS,
  CampaignCapabilities.CHRONOLOGY_EDIT,
] as const;

function stripObserverChronologyOverrides(
  rows: OverrideRow[],
): OverrideRow[] {
  return rows.filter(
    (row) =>
      !(
        row.role === MembershipRoles.OBSERVER &&
        row.capability === CampaignCapabilities.CHRONOLOGY_EDIT
      ),
  );
}

function stripParticipantChronologyOverrides(
  rows: OverrideRow[],
): OverrideRow[] {
  return rows.filter(
    (row) =>
      !(
        row.role === MembershipRoles.PARTICIPANT &&
        row.capability === CampaignCapabilities.CHRONOLOGY_EDIT
      ),
  );
}

export function CollaborationPermissionsPanel({
  campaignHandle,
  isCampaignOwner,
  onSaved,
}: {
  campaignHandle: string;
  isCampaignOwner: boolean;
  onSaved?: () => void;
}) {
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [allowPlayerChronologyManagement, setAllowPlayerChronologyManagement] =
    useState(false);
  const [savedChronologyFlag, setSavedChronologyFlag] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const policyFlags = useMemo(
    () => ({ allowPlayerChronologyManagement }),
    [allowPlayerChronologyManagement],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overrideData, campaignData] = await Promise.all([
        apiFetch<{ overrides: OverrideRow[] }>(
          `/campaigns/${campaignHandle}/capability-overrides`,
        ),
        apiFetch<{ campaign: { allowPlayerChronologyManagement?: boolean } }>(
          `/campaigns/${campaignHandle}`,
        ),
      ]);
      const chronologyFlag =
        campaignData.campaign.allowPlayerChronologyManagement ?? false;
      setOverrides(
        stripObserverChronologyOverrides(
          stripParticipantChronologyOverrides(overrideData.overrides ?? []),
        ),
      );
      setAllowPlayerChronologyManagement(chronologyFlag);
      setSavedChronologyFlag(chronologyFlag);
    } catch {
      setError('Could not load collaboration permissions.');
    } finally {
      setLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    if (isCampaignOwner) void load();
  }, [isCampaignOwner, load]);

  const isGranted = (role: string, capability: string): boolean => {
    if (
      capability === CampaignCapabilities.CHRONOLOGY_EDIT &&
      role === CampaignMemberRoles.PARTICIPANT
    ) {
      return allowPlayerChronologyManagement;
    }
    return resolveRoleCapability(
      role as (typeof COLLAB_ROLES)[number],
      capability as (typeof OVERRIDE_CAPS)[number],
      overrides,
      policyFlags,
    );
  };

  const toggle = (role: string, capability: string, next: boolean) => {
    if (
      capability === CampaignCapabilities.CHRONOLOGY_EDIT &&
      role === CampaignMemberRoles.PARTICIPANT
    ) {
      setAllowPlayerChronologyManagement(next);
      return;
    }

    setOverrides((prev) => {
      const filtered = prev.filter(
        (o) => !(o.role === role && o.capability === capability),
      );
      const membershipRole = role as (typeof COLLAB_ROLES)[number];
      const cap = capability as (typeof OVERRIDE_CAPS)[number];
      const defaultGranted = resolveRoleCapability(
        membershipRole,
        cap,
        [],
        policyFlags,
      );
      if (next === defaultGranted) {
        return filtered;
      }
      return [
        ...filtered,
        {
          role,
          capability,
          effect: next
            ? CapabilityOverrideEffect.GRANT
            : CapabilityOverrideEffect.REVOKE,
        },
      ];
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const normalized = normalizeCapabilityOverrides(
        stripObserverChronologyOverrides(
          stripParticipantChronologyOverrides(overrides),
        ),
        policyFlags,
        COLLAB_ROLES,
        OVERRIDE_CAPS,
      );

      await apiFetch(`/campaigns/${campaignHandle}/capability-overrides`, {
        method: 'PUT',
        body: JSON.stringify({ overrides: normalized }),
      });

      if (allowPlayerChronologyManagement !== savedChronologyFlag) {
        await apiFetch(`/campaigns/${campaignHandle}`, {
          method: 'PATCH',
          body: JSON.stringify({ allowPlayerChronologyManagement }),
        });
        setSavedChronologyFlag(allowPlayerChronologyManagement);
      }

      setOverrides(normalized);
      onSaved?.();
    } catch {
      setError('Could not save collaboration permissions.');
    } finally {
      setSaving(false);
    }
  };

  if (!isCampaignOwner) return null;
  if (loading) {
    return <p className="text-sm text-muted">Loading player permissions…</p>;
  }

  return (
    <section className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[32rem] text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-surface/60">
              <th className="px-3 py-2 font-medium text-muted">Capability</th>
              {COLLAB_ROLES.map((role) => (
                <th key={role} className="px-3 py-2 font-medium text-muted">
                  {role === CampaignMemberRoles.PARTICIPANT ? 'Player' : 'Observer'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX_ROWS.map((cap) => (
              <tr key={cap} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2 text-foreground">{CAP_LABELS[cap] ?? cap}</td>
                {COLLAB_ROLES.map((role) => {
                  const isChronologyObserver =
                    cap === CampaignCapabilities.CHRONOLOGY_EDIT &&
                    role === CampaignMemberRoles.OBSERVER;

                  return (
                    <td key={role} className="px-3 py-2">
                      {isChronologyObserver ? (
                        <span
                          className="inline-block text-muted"
                          aria-label="Manage chronology events not available for Observer"
                        >
                          —
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={isGranted(role, cap)}
                          onChange={(e) => toggle(role, cap, e.target.checked)}
                          aria-label={`${CAP_LABELS[cap]} for ${role}`}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Writers always have full chronology access.
      </p>
      <button
        type="button"
        className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface/80 disabled:opacity-50"
        disabled={saving}
        onClick={() => void save()}
      >
        {saving ? 'Saving…' : 'Save permissions'}
      </button>
    </section>
  );
}
