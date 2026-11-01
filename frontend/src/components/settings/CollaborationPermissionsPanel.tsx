import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { audioRequest, type AudioSettingsPayload, type ProviderConnection } from '@/lib/sessionAudio';
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
import {
  MATRIX_SECTIONS,
  matrixCapabilityLabel,
  type MatrixCoverageNote,
  type MatrixRow,
  type MatrixSection,
} from '@shared/campaignPolicy/matrixCatalog';
import { DocsLearnMoreLink } from '@/components/guides/DocsLearnMoreLink';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import {
  hasEnabledTranscriptionProvider,
  matrixFeatureStatuses,
  matrixGlobalAdminHelp,
  matrixRowHasHelp,
  matrixRowHelp,
  matrixRowSettingLink,
  type MatrixCellTone,
  type MatrixStatusItem,
} from '@/lib/matrixRowPresentation';

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

const TONE_CLASS: Record<MatrixCellTone, string> = {
  inherited: 'border-border text-muted',
  override: 'border-primary/40 text-primary',
  unavailable: 'border-border text-muted',
  'disabled-global': 'border-amber-700/40 text-amber-900 dark:text-amber-200',
  'disabled-setting': 'border-amber-700/40 text-amber-900 dark:text-amber-200',
  'missing-provider': 'border-amber-700/40 text-amber-900 dark:text-amber-200',
};

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

function StatusChip({ item }: { item: MatrixStatusItem }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[item.tone]}`}
    >
      {item.label}
    </span>
  );
}

function CapabilityHelp({
  row,
  globallyDisabled,
}: {
  row: MatrixRow;
  globallyDisabled: boolean;
}) {
  if (!matrixRowHasHelp(row, globallyDisabled)) return null;
  const help = matrixRowHelp(row);
  const adminHelp = matrixGlobalAdminHelp(row, globallyDisabled);
  return (
    <HelpTooltip label={row.label}>
      {adminHelp ? <p>{adminHelp}</p> : null}
      {help?.explanation ? <p>{help.explanation}</p> : null}
      {help?.docsKey ? (
        <DocsLearnMoreLink
          doc={help.docsKey}
          label={help.docsLabel ?? 'Learn more in the docs'}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        />
      ) : null}
    </HelpTooltip>
  );
}

function CapabilityTitle({
  row,
  globallyDisabled,
  heading,
}: {
  row: MatrixRow;
  globallyDisabled: boolean;
  heading?: boolean;
}) {
  const TitleTag = heading ? 'h4' : 'div';
  return (
    <div>
      <div className="flex items-center gap-1">
        <TitleTag className={heading ? 'text-sm font-medium text-foreground' : 'font-medium text-foreground'}>
          {row.label}
        </TitleTag>
        <CapabilityHelp row={row} globallyDisabled={globallyDisabled} />
      </div>
      <p className="mt-0.5 text-muted">{row.description}</p>
    </div>
  );
}

function CoverageNotes({ notes }: { notes: readonly MatrixCoverageNote[] }) {
  return (
    <ul className="space-y-1.5 px-3 py-2 text-xs text-muted">
      {notes.map((note) => {
        const label = matrixCapabilityLabel(note.uses) ?? note.uses;
        return (
          <li key={`${note.uses}-${note.note}`}>
            Uses{' '}
            <a
              href={`#matrix-cap-${note.uses.replaceAll('.', '-')}`}
              className="text-primary underline-offset-2 hover:underline"
            >
              {label}
            </a>
            . {note.note}
          </li>
        );
      })}
    </ul>
  );
}

function RoleGrantControl({
  role,
  row,
  checked,
  editable,
  unavailable,
  globallyDisabled,
  onToggle,
}: {
  role: MembershipRole;
  row: MatrixRow;
  checked: boolean;
  editable: boolean;
  unavailable: boolean;
  globallyDisabled: boolean;
  onToggle: (next: boolean) => void;
}) {
  const roleLabel = MEMBERSHIP_ROLE_UI_LABELS[role];
  if (unavailable) {
    return (
      <div>
        <span className="text-muted" aria-hidden>
          —
        </span>
        <span className="sr-only">{`${row.label} for ${roleLabel}: unavailable`}</span>
      </div>
    );
  }
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={!editable}
      onChange={(event) => onToggle(event.target.checked)}
      aria-label={`${row.label} for ${roleLabel}`}
      title={
        globallyDisabled
          ? 'Disabled by Global Admin'
          : editable
            ? undefined
            : 'Not overridable here'
      }
    />
  );
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
  const panelId = useId();
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [allowPlayerChronologyManagement, setAllowPlayerChronologyManagement] =
    useState(false);
  const [savedChronologyFlag, setSavedChronologyFlag] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    campaign: true,
    wiki: true,
    adventure: true,
  });
  const [audioGlobalEnabled, setAudioGlobalEnabled] = useState<boolean | null>(null);
  const [audioSettings, setAudioSettings] = useState<AudioSettingsPayload['settings'] | null>(null);
  const [hasTranscriptionProvider, setHasTranscriptionProvider] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
        const [audio, providers] = await Promise.all([
          audioRequest<AudioSettingsPayload>(campaignHandle, '/settings'),
          audioRequest<ProviderConnection[]>(campaignHandle, '/providers'),
        ]);
        setAudioGlobalEnabled(audio.global.enabled);
        setAudioSettings(audio.settings);
        setHasTranscriptionProvider(hasEnabledTranscriptionProvider(providers));
      } catch {
        setAudioGlobalEnabled(null);
        setAudioSettings(null);
        setHasTranscriptionProvider(null);
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
    setNotice(null);
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
        (item) => !(item.role === role && item.capability === row.capability),
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
    setNotice(null);
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

  const resetToDefaults = () => {
    setAllowPlayerChronologyManagement(false);
    setOverrides((prev) =>
      prev.filter(
        (row) =>
          !EDITABLE_ROLES.includes(row.role as MembershipRole) ||
          !editableCaps.includes(row.capability as CampaignCapability),
      ),
    );
    setError(null);
    setNotice('Default permissions restored. Save to apply changes.');
  };

  const canReset =
    allowPlayerChronologyManagement ||
    overrides.some(
      (row) =>
        EDITABLE_ROLES.includes(row.role as MembershipRole) &&
        editableCaps.includes(row.capability as CampaignCapability),
    );

  if (!canManage) return null;
  if (loading) {
    return <p className="text-sm text-muted">Loading role capabilities…</p>;
  }

  const roleControlsFor = (row: MatrixRow) =>
    DISPLAY_ROLES.map((role) => {
      const globallyDisabled =
        row.globalFeature === 'audio' && audioGlobalEnabled === false;
      return (
        <RoleGrantControl
          key={role}
          role={role}
          row={row}
          checked={isGranted(role, row)}
          editable={canEditCell(role, row) && !globallyDisabled}
          unavailable={Boolean(
            row.observerUnavailable && role === MembershipRoles.OBSERVER,
          )}
          globallyDisabled={globallyDisabled}
          onToggle={(next) => toggle(role, row, next)}
        />
      );
    });

  const renderSection = (section: MatrixSection) => {
    const open = openSections[section.id] === true;
    const sectionPanelId = `${panelId}-${section.id}`;
    const showStatus = section.rows.some(
      (row) =>
        matrixFeatureStatuses(row, {
          audioGlobalEnabled,
          audioSettings,
          hasTranscriptionProvider,
        }).length > 0,
    );
    return (
      <div key={section.id} className="overflow-hidden rounded-md border border-border">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 bg-surface/60 px-3 py-2 text-left"
          onClick={() =>
            setOpenSections((prev) => ({ ...prev, [section.id]: !open }))
          }
          aria-expanded={open}
          aria-controls={sectionPanelId}
        >
          <span>
            <span className="block text-sm font-medium text-foreground">{section.title}</span>
            <span className="mt-0.5 block text-xs text-muted">{section.scope}</span>
          </span>
          <span className="text-xs text-muted">{open ? 'Hide' : 'Show'}</span>
        </button>
        {open ? (
          <div id={sectionPanelId}>
            {section.coverage ? <CoverageNotes notes={section.coverage} /> : null}
            {section.rows.length > 0 ? (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[40rem] text-left text-xs">
                    <caption className="sr-only">
                      {section.title} role capabilities
                    </caption>
                    <thead>
                      <tr className="border-y border-border/60">
                        <th className="px-3 py-2 font-medium text-muted">Capability</th>
                        {showStatus ? (
                          <th className="px-3 py-2 font-medium text-muted">Status</th>
                        ) : null}
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
                        const setting = matrixRowSettingLink(
                          row,
                          campaignHandle,
                          globallyDisabled,
                        );
                        const statuses = matrixFeatureStatuses(row, {
                          audioGlobalEnabled,
                          audioSettings,
                          hasTranscriptionProvider,
                        });
                        const roleControls = roleControlsFor(row);
                        return (
                          <tr
                            key={row.capability}
                            id={`matrix-cap-${row.capability.replaceAll('.', '-')}`}
                            className="border-b border-border/60 last:border-0"
                          >
                            <td className="px-3 py-2 align-top">
                              <CapabilityTitle
                                row={row}
                                globallyDisabled={globallyDisabled}
                              />
                              {setting ? (
                                <Link
                                  to={setting.href}
                                  className="mt-1 inline-block text-primary underline-offset-2 hover:underline"
                                >
                                  {setting.label}
                                </Link>
                              ) : null}
                            </td>
                            {showStatus ? (
                              <td className="px-3 py-2 align-top">
                                {statuses.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {statuses.map((item) => (
                                      <StatusChip key={`${item.tone}-${item.label}`} item={item} />
                                    ))}
                                  </div>
                                ) : null}
                              </td>
                            ) : null}
                            {DISPLAY_ROLES.map((role, index) => (
                              <td key={role} className="px-3 py-2 align-top">
                                {roleControls[index]}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3 p-3 md:hidden">
                  {section.rows.map((row) => {
                    const globallyDisabled =
                      row.globalFeature === 'audio' && audioGlobalEnabled === false;
                    const setting = matrixRowSettingLink(
                      row,
                      campaignHandle,
                      globallyDisabled,
                    );
                    const statuses = matrixFeatureStatuses(row, {
                      audioGlobalEnabled,
                      audioSettings,
                      hasTranscriptionProvider,
                    });
                    const roleControls = roleControlsFor(row);
                    return (
                      <article
                        key={row.capability}
                        className="rounded-md border border-border/70 p-3"
                      >
                        <CapabilityTitle
                          row={row}
                          globallyDisabled={globallyDisabled}
                          heading
                        />
                        {setting ? (
                          <Link
                            to={setting.href}
                            className="mt-2 inline-block text-xs text-primary underline-offset-2 hover:underline"
                          >
                            {setting.label}
                          </Link>
                        ) : null}
                        {statuses.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {statuses.map((item) => (
                              <StatusChip key={`${item.tone}-${item.label}`} item={item} />
                            ))}
                          </div>
                        ) : null}
                        <ul className="mt-3 space-y-2">
                          {DISPLAY_ROLES.map((role, index) => (
                            <li
                              key={role}
                              className="flex items-start justify-between gap-3"
                            >
                              <span className="text-xs text-foreground">
                                {MEMBERSHIP_ROLE_UI_LABELS[role]}
                              </span>
                              {roleControls[index]}
                            </li>
                          ))}
                        </ul>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <section className="space-y-4" aria-labelledby={`${panelId}-heading`}>
      <h4 id={`${panelId}-heading`} className="sr-only">
        Campaign role capability matrix
      </h4>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <p className="text-xs text-muted">
        Game Master and Writer show effective grants. Player and Observer can
        store overrides.
      </p>
      <div className="space-y-3">{MATRIX_SECTIONS.map(renderSection)}</div>
      <p className="text-xs text-muted">
        Public is not a role. When both public-access gates allow it, anonymous
        visitors inherit Observer’s effective read permissions.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface/80 disabled:opacity-50"
          disabled={saving || !canReset}
          onClick={resetToDefaults}
        >
          Reset to defaults
        </button>
        <button
          type="button"
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface/80 disabled:opacity-50"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? 'Saving…' : 'Save permissions'}
        </button>
      </div>
      {notice ? (
        <p className="text-xs text-muted" role="status">
          {notice}
        </p>
      ) : null}
    </section>
  );
}

export { CampaignMemberRoles };
