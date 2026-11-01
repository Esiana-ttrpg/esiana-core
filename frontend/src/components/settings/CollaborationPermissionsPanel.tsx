import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { audioRequest, type AudioSettingsPayload } from '@/lib/sessionAudio';
import { CampaignMemberRoles } from '@/types/domain';
import { CampaignCapabilities, type CampaignCapability } from '@shared/campaignPolicy/capabilities';
import {
  CapabilityOverrideEffect,
  normalizeCapabilityOverrides,
  resolveRoleCapability,
  type CampaignRoleCapabilityOverrideRow,
} from '@shared/campaignPolicy/capabilityOverrides';
import { MembershipRoles, MEMBERSHIP_ROLE_UI_LABELS, type MembershipRole } from '@shared/campaignPolicy/membershipRoles';
import { campaignAdminCapabilitiesFor } from '@shared/campaignPolicy/campaignAdminGrants';
import { MATRIX_SECTIONS, type MatrixRow } from '@shared/campaignPolicy/matrixCatalog';

type OverrideRow = CampaignRoleCapabilityOverrideRow;

const DISPLAY_ROLES: readonly MembershipRole[] = [
  MembershipRoles.GAMEMASTER,
  MembershipRoles.WRITER,
  MembershipRoles.PARTICIPANT,
  MembershipRoles.OBSERVER,
];

const EDITABLE_ROLES: readonly MembershipRole[] = [
  MembershipRoles.PARTICIPANT,
  MembershipRoles.OBSERVER,
];

function stripChronologyOverrides(rows: OverrideRow[]): OverrideRow[] {
  return rows.filter(
    (row) => row.capability !== CampaignCapabilities.CHRONOLOGY_EDIT,
  );
}

function staffEffective(
  role: MembershipRole,
  capability: CampaignCapability,
  overrides: readonly OverrideRow[],
): boolean {
  const granted = resolveRoleCapability(role, capability, overrides);
  if (
    role === MembershipRoles.GAMEMASTER &&
    campaignAdminCapabilitiesFor(false, true).has(capability)
  ) {
    return true;
  }
  return granted;
}

function overridableCapabilities(): CampaignCapability[] {
  const caps = new Set<CampaignCapability>();
  for (const section of MATRIX_SECTIONS) {
    for (const row of section.rows) {
      if (row.overridableRoles.length > 0) caps.add(row.capability);
    }
  }
  return [...caps];
}

export function CollaborationPermissionsPanel({
  campaignHandle,
  canManage,
  onSaved,
}: {
  campaignHandle: string;
  canManage: boolean;
  isCampaignOwner?: boolean;
  onSaved?: () => void;
}) {
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [allowPlayerChronologyManagement, setAllowPlayerChronologyManagement] =
    useState(false);
  const [savedChronologyFlag, setSavedChronologyFlag] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    campaign: true,
    wiki: true,
    sessions: true,
  });
  const [audioGlobalEnabled, setAudioGlobalEnabled] = useState<boolean | null>(null);
  const [audioSettings, setAudioSettings] = useState<AudioSettingsPayload['settings'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const policyFlags = useMemo(
    () => ({ allowPlayerChronologyManagement }),
    [allowPlayerChronologyManagement],
  );

  const editableCaps = useMemo(() => overridableCapabilities(), []);

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
      setOverrides(stripChronologyOverrides(overrideData.overrides ?? []));
      setAllowPlayerChronologyManagement(chronologyFlag);
      setSavedChronologyFlag(chronologyFlag);
      try {
        const audio = await audioRequest<AudioSettingsPayload>(campaignHandle, '/settings');
        setAudioGlobalEnabled(audio.global.enabled);
        setAudioSettings(audio.settings);
      } catch {
        setAudioGlobalEnabled(null);
        setAudioSettings(null);
      }
    } catch {
      setError('Could not load campaign permissions.');
    } finally {
      setLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    if (canManage) void load();
  }, [canManage, load]);

  const isGranted = (role: MembershipRole, row: MatrixRow): boolean => {
    if (role === MembershipRoles.GAMEMASTER || role === MembershipRoles.WRITER) {
      return staffEffective(role, row.capability, overrides);
    }
    if (row.observerUnavailable && role === MembershipRoles.OBSERVER) {
      return false;
    }
    if (
      row.chronologyFlag &&
      row.capability === CampaignCapabilities.CHRONOLOGY_EDIT &&
      role === MembershipRoles.PARTICIPANT
    ) {
      return allowPlayerChronologyManagement;
    }
    return resolveRoleCapability(role, row.capability, overrides, policyFlags);
  };

  const canEditCell = (role: MembershipRole, row: MatrixRow): boolean => {
    if (!canManage) return false;
    if (row.observerUnavailable && role === MembershipRoles.OBSERVER) return false;
    return row.overridableRoles.includes(role);
  };

  const toggle = (role: MembershipRole, row: MatrixRow, next: boolean) => {
    if (!canEditCell(role, row)) return;
    if (
      row.chronologyFlag &&
      row.capability === CampaignCapabilities.CHRONOLOGY_EDIT &&
      role === MembershipRoles.PARTICIPANT
    ) {
      setAllowPlayerChronologyManagement(next);
      return;
    }
    setOverrides((prev) => {
      const filtered = prev.filter(
        (o) => !(o.role === role && o.capability === row.capability),
      );
      const defaultGranted = resolveRoleCapability(role, row.capability, [], policyFlags);
      if (next === defaultGranted) return filtered;
      return [
        ...filtered,
        {
          role,
          capability: row.capability,
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
        stripChronologyOverrides(overrides),
        policyFlags,
        EDITABLE_ROLES,
        editableCaps,
      );
      const preserved = overrides.filter(
        (row) =>
          !EDITABLE_ROLES.includes(row.role as MembershipRole) ||
          !editableCaps.includes(row.capability as CampaignCapability),
      );

      await apiFetch(`/campaigns/${campaignHandle}/capability-overrides`, {
        method: 'PUT',
        body: JSON.stringify({ overrides: [...preserved, ...normalized] }),
      });

      if (allowPlayerChronologyManagement !== savedChronologyFlag) {
        await apiFetch(`/campaigns/${campaignHandle}`, {
          method: 'PATCH',
          body: JSON.stringify({ allowPlayerChronologyManagement }),
        });
        setSavedChronologyFlag(allowPlayerChronologyManagement);
      }

      setOverrides([...preserved, ...normalized]);
      onSaved?.();
    } catch {
      setError('Could not save campaign permissions.');
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) return null;
  if (loading) {
    return <p className="text-sm text-muted">Loading role capabilities…</p>;
  }

  return (
    <section className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <p className="text-xs text-muted">
        Game Master and Writer columns show effective grants. Player and Observer
        cells write overrides. Resetting a cell to its default removes the override.
      </p>
      <div className="space-y-3">
        {MATRIX_SECTIONS.map((section) => {
          const open = openSections[section.id] !== false;
          return (
            <div key={section.id} className="overflow-hidden rounded-md border border-border">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 bg-surface/60 px-3 py-2 text-left"
                onClick={() =>
                  setOpenSections((prev) => ({ ...prev, [section.id]: !open }))
                }
                aria-expanded={open}
              >
                <span>
                  <span className="block text-sm font-medium text-foreground">{section.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{section.scope}</span>
                </span>
                <span className="text-xs text-muted">{open ? 'Hide' : 'Show'}</span>
              </button>
              {open ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-left text-xs">
                    <thead>
                      <tr className="border-y border-border/60">
                        <th className="px-3 py-2 font-medium text-muted">Capability</th>
                        {DISPLAY_ROLES.map((role) => (
                          <th key={role} className="px-3 py-2 font-medium text-muted">
                            {MEMBERSHIP_ROLE_UI_LABELS[role]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row) => {
                        const globallyDisabled =
                          row.globalFeature === 'audio' && audioGlobalEnabled === false;
                        const hint = [
                          globallyDisabled ? 'Disabled by Global Admin' : null,
                          row.tooltip,
                          row.campaignFeatureHint,
                          row.capability === CampaignCapabilities.ASSETS_UPLOAD &&
                          audioSettings &&
                          !audioSettings.allowContributors
                            ? 'Campaign Audio contributor uploads are off.'
                            : null,
                          row.capability === CampaignCapabilities.AUDIO_CHAPTERS_EDIT &&
                          audioSettings &&
                          !audioSettings.allowChapters
                            ? 'Chapter contributions are off in Campaign Audio settings.'
                            : null,
                          row.capability === CampaignCapabilities.AUDIO_TRANSCRIPT_EDIT &&
                          audioSettings &&
                          !audioSettings.allowTranscripts
                            ? 'Transcript contributions are off in Campaign Audio settings.'
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' ');
                        return (
                          <tr key={row.capability} className="border-b border-border/60 last:border-0">
                            <td className="px-3 py-2 align-top">
                              <div className="font-medium text-foreground">{row.label}</div>
                              <div className="mt-0.5 text-muted">{row.description}</div>
                              {hint ? (
                                <div className="mt-1 text-[11px] text-amber-800 dark:text-amber-200">
                                  {hint}
                                </div>
                              ) : null}
                            </td>
                            {DISPLAY_ROLES.map((role) => {
                              const checked = isGranted(role, row);
                              const editable = canEditCell(role, row) && !globallyDisabled;
                              if (row.observerUnavailable && role === MembershipRoles.OBSERVER) {
                                return (
                                  <td key={role} className="px-3 py-2 text-muted">
                                    —
                                  </td>
                                );
                              }
                              return (
                                <td key={role} className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={!editable}
                                    onChange={(e) => toggle(role, row, e.target.checked)}
                                    aria-label={`${row.label} for ${MEMBERSHIP_ROLE_UI_LABELS[role]}`}
                                    title={
                                      globallyDisabled
                                        ? 'Disabled by Global Admin'
                                        : editable
                                          ? undefined
                                          : 'Effective grant (not overridable here)'
                                    }
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        Public is not a role. When both the instance login gate and this
        campaign’s public access setting allow it, anonymous visitors inherit
        Observer’s effective read permissions. A public instance still does not
        grant access to private campaigns or restricted content.
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

export { CampaignMemberRoles };
