import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import {
  DEFAULT_HAVEN_STATUS,
  DEFAULT_HAVEN_TYPE,
  HAVEN_DISCOVERY_STATES,
  HAVEN_OWNERSHIP_TYPES,
  HAVEN_PRIMARY_THEMES,
  HAVEN_SCALES,
  HAVEN_STATUSES,
  HAVEN_TYPES,
  HAVEN_THREAT_SEVERITIES,
  formatHavenDiscoveryLabel,
  formatHavenOwnershipLabel,
  formatHavenStatusLabel,
  formatHavenThemeLabel,
  formatHavenTypeLabel,
  createHavenBenefitEntry,
  createHavenCrewEntry,
  createHavenReferenceEntry,
  createHavenSpaceEntry,
  createHavenThreatEntry,
  createHavenUpgradeEntry,
  HAVEN_REFERENCE_TYPES,
  type HavenBenefitEntry,
  type HavenCrewEntry,
  type HavenDiscoveryState,
  type HavenIdentityHints,
  type HavenReferenceEntry,
  type HavenReferenceTargetType,
  type HavenReferenceType,
  type HavenSpaceEntry,
  type HavenOwnershipType,
  type HavenPrimaryTheme,
  type HavenScale,
  type HavenStatus,
  type HavenThreatEntry,
  type HavenUpgradeEntry,
  type HavenThreatSeverity,
  type HavenType,
} from '@shared/havenMetadata';
import {
  HAVEN_SIMULATION_AXES,
  axisValueForBandIndex,
  bandIndexForValue,
  formatHavenSimulationAxisLabel,
  listHavenSimulationBandLabels,
  parseHavenSimulationFromHints,
  type HavenSimulationAxis,
  type HavenSimulationAxes,
} from '@shared/havenSimulation';
import { parseHavenLedgerSimulationHints } from '@shared/havenMetadata';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { HavenAssetIdField } from '@/components/downtime/HavenAssetIdField';
import { fetchDowntimeHaven, updateDowntimeHaven } from '@/lib/downtime';
import { storeScheduledTreasuryPrefill } from '@/lib/downtimeScheduledEffects';
import { downtimeSectionHref } from '@/lib/downtimeLayout';
import { campaignDowntimeHubPath } from '@/lib/campaignPaths';
import {
  filterLocationPages,
  filterNpcPages,
  filterOrganizationPages,
} from '@/lib/questHubLayout';
import type { WikiTreeNode } from '@/types/wiki';

interface ManageHavenModalProps {
  open: boolean;
  campaignHandle: string;
  havenId: string;
  flatPages: WikiTreeNode[];
  downtimeCategoryPageId?: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

const fieldClass =
  'mt-1 w-full rounded border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none transition-colors focus:border-primary/60';
const sectionClass = 'space-y-3 border-t border-border/60 pt-4 first:border-t-0 first:pt-0';

export function ManageHavenModal({
  open,
  campaignHandle,
  havenId,
  flatPages,
  downtimeCategoryPageId,
  onClose,
  onUpdated,
}: ManageHavenModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [wikiPageId, setWikiPageId] = useState<string | null>(null);
  const [havenType, setHavenType] = useState<HavenType>(DEFAULT_HAVEN_TYPE);
  const [status, setStatus] = useState<HavenStatus>(DEFAULT_HAVEN_STATUS);
  const [scale, setScale] = useState<HavenScale | ''>('');
  const [ownershipType, setOwnershipType] = useState<HavenOwnershipType | ''>('');
  const [primaryTheme, setPrimaryTheme] = useState<HavenPrimaryTheme | ''>('');
  const [discoveryState, setDiscoveryState] = useState<HavenDiscoveryState | ''>('');
  const [residentPageIds, setResidentPageIds] = useState<string[]>([]);
  const [addResidentId, setAddResidentId] = useState<string | null>(null);
  const [locationPageId, setLocationPageId] = useState<string | null>(null);
  const [factionPageIds, setFactionPageIds] = useState<string[]>([]);
  const [addFactionId, setAddFactionId] = useState<string | null>(null);
  const [relatedPageIds, setRelatedPageIds] = useState<string[]>([]);
  const [addRelatedId, setAddRelatedId] = useState<string | null>(null);
  const [identityHints, setIdentityHints] = useState<HavenIdentityHints>({
    summary: null,
    portraitAssetId: null,
    crestAssetId: null,
    galleryAssetIds: [],
  });
  const [references, setReferences] = useState<HavenReferenceEntry[]>([]);
  const [spaces, setSpaces] = useState<HavenSpaceEntry[]>([]);
  const [crew, setCrew] = useState<HavenCrewEntry[]>([]);
  const [passiveBenefits, setPassiveBenefits] = useState<HavenBenefitEntry[]>([]);
  const [newCrewLabel, setNewCrewLabel] = useState('');
  const [newCrewRole, setNewCrewRole] = useState('');
  const [newBenefitLabel, setNewBenefitLabel] = useState('');
  const [newBenefitDescription, setNewBenefitDescription] = useState('');
  const [newSpaceLabel, setNewSpaceLabel] = useState('');
  const [newSpaceDescription, setNewSpaceDescription] = useState('');
  const [newRefType, setNewRefType] = useState<HavenReferenceType>('wiki_page');
  const [newRefTitle, setNewRefTitle] = useState('');
  const [newRefTargetType, setNewRefTargetType] =
    useState<HavenReferenceTargetType>('wiki_page');
  const [newRefTargetId, setNewRefTargetId] = useState<string | null>(null);
  const [newRefUrl, setNewRefUrl] = useState('');
  const [newRefAssetId, setNewRefAssetId] = useState<string | null>(null);

  const [activitySummary, setActivitySummary] = useState('');
  const [activityTone, setActivityTone] = useState<'neutral' | 'warning' | 'escalation' | ''>(
    '',
  );

  const [newThreatLabel, setNewThreatLabel] = useState('');
  const [newThreatSeverity, setNewThreatSeverity] = useState<HavenThreatSeverity | ''>('');
  const [newUpgradeLabel, setNewUpgradeLabel] = useState('');
  const [newUpgradeDescription, setNewUpgradeDescription] = useState('');

  const [existingThreats, setExistingThreats] = useState<HavenThreatEntry[]>([]);
  const [existingUpgrades, setExistingUpgrades] = useState<HavenUpgradeEntry[]>([]);

  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [simulationPausedReason, setSimulationPausedReason] = useState('');
  const [simulationAxes, setSimulationAxes] = useState<HavenSimulationAxes>(() => ({
    prosperity: 50,
    danger: 50,
    morale: 50,
    notoriety: 50,
    stability: 50,
    security: 50,
  }));
  const [lockedAxes, setLockedAxes] = useState<
    Partial<Record<HavenSimulationAxis, boolean>>
  >({});
  const [ledgerUpkeepSuggestionsEnabled, setLedgerUpkeepSuggestionsEnabled] =
    useState(false);
  const [upkeepCost, setUpkeepCost] = useState('');
  const [constructionCost, setConstructionCost] = useState('');

  const characterPages = useMemo(
    () => filterNpcPages(flatPages),
    [flatPages],
  );
  const locationPages = useMemo(
    () => filterLocationPages(flatPages),
    [flatPages],
  );
  const organizationPages = useMemo(
    () => filterOrganizationPages(flatPages),
    [flatPages],
  );
  const wikiPickPages = useMemo(
    () => flatPages.filter((page) => page.templateType !== 'DOWNTIME_HAVEN'),
    [flatPages],
  );

  const residentLabels = useMemo(() => {
    const byId = new Map(flatPages.map((page) => [page.id, page.title]));
    return residentPageIds.map((id) => ({ id, title: byId.get(id) ?? 'Unknown' }));
  }, [flatPages, residentPageIds]);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setActivitySummary('');
    setActivityTone('');
    setNewThreatLabel('');
    setNewThreatSeverity('');
    setNewUpgradeLabel('');
    setNewUpgradeDescription('');
    setAddResidentId(null);

    void (async () => {
      setLoading(true);
      try {
        const haven = await fetchDowntimeHaven(campaignHandle, havenId);
        setTitle(haven.title);
        setWikiPageId(haven.wikiPageId);
        setHavenType(haven.havenType);
        setStatus(haven.status);
        setScale(haven.scale ?? '');
        setOwnershipType(haven.ownershipType ?? '');
        setPrimaryTheme(haven.primaryTheme ?? '');
        setDiscoveryState(haven.discoveryState ?? '');
        setResidentPageIds(haven.residentPageIds);
        setLocationPageId(haven.locationPageId);
        setFactionPageIds(haven.factionPageIds);
        setRelatedPageIds(haven.relatedPageIds);
        setIdentityHints(haven.identityHints);
        setReferences(haven.references);
        setSpaces(haven.spaces);
        setCrew(haven.crew);
        setPassiveBenefits(haven.passiveBenefits);
        setExistingThreats(haven.threats);
        setExistingUpgrades(haven.upgrades);
        const simulation = parseHavenSimulationFromHints(haven.simulationHints);
        setSimulationEnabled(simulation.enabled);
        setSimulationPausedReason(simulation.pausedReason ?? '');
        setSimulationAxes(simulation.axes);
        setLockedAxes(simulation.lockedAxes);
        const ledgerHints = parseHavenLedgerSimulationHints(haven.simulationHints);
        setLedgerUpkeepSuggestionsEnabled(ledgerHints.ledgerUpkeepSuggestionsEnabled);
        setUpkeepCost(
          ledgerHints.upkeepCost != null ? String(ledgerHints.upkeepCost) : '',
        );
        setConstructionCost(
          ledgerHints.constructionCost != null
            ? String(ledgerHints.constructionCost)
            : '',
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load haven.');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, campaignHandle, havenId]);

  if (!open) return null;

  function addResident() {
    if (!addResidentId || residentPageIds.includes(addResidentId)) return;
    setResidentPageIds((prev) => [...prev, addResidentId]);
    setAddResidentId(null);
  }

  function removeResident(pageId: string) {
    setResidentPageIds((prev) => prev.filter((id) => id !== pageId));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const threats = [...existingThreats];
      if (newThreatLabel.trim()) {
        threats.push(
          createHavenThreatEntry({
            label: newThreatLabel.trim(),
            severity: newThreatSeverity || null,
          }),
        );
      }

      const upgrades = [...existingUpgrades];
      if (newUpgradeLabel.trim()) {
        upgrades.push(
          createHavenUpgradeEntry({
            label: newUpgradeLabel.trim(),
            description: newUpgradeDescription.trim() || null,
          }),
        );
      }

      const nextSpaces = [...spaces];
      if (newSpaceLabel.trim()) {
        nextSpaces.push(
          createHavenSpaceEntry({
            label: newSpaceLabel.trim(),
            description: newSpaceDescription.trim() || null,
            sortOrder: nextSpaces.length,
          }),
        );
      }

      const nextReferences = [...references];
      if (newRefTitle.trim()) {
        const targetType =
          newRefType === 'external_doc'
            ? ('external' as const)
            : newRefTargetType;
        nextReferences.push(
          createHavenReferenceEntry({
            type: newRefType,
            title: newRefTitle.trim(),
            targetType,
            targetId:
              targetType === 'external'
                ? null
                : targetType === 'asset'
                  ? newRefAssetId
                  : newRefTargetId,
            url: newRefType === 'external_doc' ? newRefUrl.trim() || null : null,
            sortOrder: nextReferences.length,
          }),
        );
      }

      const nextCrew = [...crew];
      if (newCrewLabel.trim()) {
        nextCrew.push(
          createHavenCrewEntry({
            label: newCrewLabel.trim(),
            role: newCrewRole.trim() || null,
          }),
        );
      }

      const nextBenefits = [...passiveBenefits];
      if (newBenefitLabel.trim()) {
        nextBenefits.push(
          createHavenBenefitEntry({
            label: newBenefitLabel.trim(),
            description: newBenefitDescription.trim() || null,
          }),
        );
      }

      const patch: Parameters<typeof updateDowntimeHaven>[2] = {
        title: title.trim(),
        havenType,
        status,
        scale: scale || null,
        ownershipType: ownershipType || null,
        primaryTheme: primaryTheme || null,
        discoveryState: discoveryState || null,
        locationPageId,
        residentPageIds,
        factionPageIds,
        relatedPageIds,
        identityHints,
        references: nextReferences,
        spaces: nextSpaces,
        crew: nextCrew,
        passiveBenefits: nextBenefits,
        threats,
        upgrades,
        havenSimulation: {
          enabled: simulationEnabled,
          pausedReason: simulationPausedReason.trim() || null,
          axes: simulationAxes,
          lockedAxes,
        },
        ledgerSimulationHints: {
          ledgerUpkeepSuggestionsEnabled,
          upkeepCost: upkeepCost.trim()
            ? Number.parseInt(upkeepCost.trim(), 10)
            : null,
          constructionCost: constructionCost.trim()
            ? Number.parseInt(constructionCost.trim(), 10)
            : null,
        },
      };

      if (activitySummary.trim()) {
        patch.appendActivity = {
          summary: activitySummary.trim(),
          tone: activityTone || null,
        };
      }

      await updateDowntimeHaven(campaignHandle, havenId, patch);
      onUpdated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update haven.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-haven-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-background shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="manage-haven-title" className="text-base font-semibold text-foreground">
            Manage haven
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">Loading haven…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-0 px-4 py-4">
            <div className={sectionClass}>
              <label className="block text-sm font-medium text-foreground">
                Title
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={fieldClass}
                  required
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-foreground">
                  Status
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as HavenStatus)}
                    className={fieldClass}
                  >
                    {HAVEN_STATUSES.map((entry) => (
                      <option key={entry} value={entry}>
                        {formatHavenStatusLabel(entry)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-foreground">
                  Type
                  <select
                    value={havenType}
                    onChange={(event) => setHavenType(event.target.value as HavenType)}
                    className={fieldClass}
                  >
                    {HAVEN_TYPES.map((entry) => (
                      <option key={entry} value={entry}>
                        {formatHavenTypeLabel(entry)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-foreground">
                  Scale
                  <select
                    value={scale}
                    onChange={(event) => setScale(event.target.value as HavenScale | '')}
                    className={fieldClass}
                  >
                    <option value="">Not set</option>
                    {HAVEN_SCALES.map((entry) => (
                      <option key={entry} value={entry}>
                        {entry.charAt(0).toUpperCase() + entry.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-foreground">
                  Ownership
                  <select
                    value={ownershipType}
                    onChange={(event) =>
                      setOwnershipType(event.target.value as HavenOwnershipType | '')
                    }
                    className={fieldClass}
                  >
                    <option value="">Not set</option>
                    {HAVEN_OWNERSHIP_TYPES.map((entry) => (
                      <option key={entry} value={entry}>
                        {formatHavenOwnershipLabel(entry)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-foreground">
                  Theme
                  <select
                    value={primaryTheme}
                    onChange={(event) =>
                      setPrimaryTheme(event.target.value as HavenPrimaryTheme | '')
                    }
                    className={fieldClass}
                  >
                    <option value="">Not set</option>
                    {HAVEN_PRIMARY_THEMES.map((entry) => (
                      <option key={entry} value={entry}>
                        {formatHavenThemeLabel(entry)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-foreground">
                  Discovery
                  <select
                    value={discoveryState}
                    onChange={(event) =>
                      setDiscoveryState(event.target.value as HavenDiscoveryState | '')
                    }
                    className={fieldClass}
                  >
                    <option value="">Not set</option>
                    {HAVEN_DISCOVERY_STATES.map((entry) => (
                      <option key={entry} value={entry}>
                        {formatHavenDiscoveryLabel(entry)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className={sectionClass}>
              <p className="text-sm font-medium text-foreground">Identity</p>
              <p className="text-xs text-muted-foreground">
                Banner image uses the wiki page featured image — set via Edit lore.
              </p>
              <label className="block text-sm font-medium text-foreground">
                Summary
                <textarea
                  value={identityHints.summary ?? ''}
                  onChange={(event) =>
                    setIdentityHints((prev) => ({
                      ...prev,
                      summary: event.target.value || null,
                    }))
                  }
                  className={`${fieldClass} min-h-[64px] resize-y`}
                  placeholder="What is this place?"
                />
              </label>
              <HavenAssetIdField
                campaignHandle={campaignHandle}
                label="Portrait / key art"
                value={identityHints.portraitAssetId}
                onChange={(assetId) =>
                  setIdentityHints((prev) => ({ ...prev, portraitAssetId: assetId }))
                }
              />
              <HavenAssetIdField
                campaignHandle={campaignHandle}
                label="Crest / icon"
                value={identityHints.crestAssetId}
                onChange={(assetId) =>
                  setIdentityHints((prev) => ({ ...prev, crestAssetId: assetId }))
                }
              />
              <HavenAssetIdField
                campaignHandle={campaignHandle}
                label="Ambient gallery"
                value={identityHints.galleryAssetIds}
                onChange={(assetIds) =>
                  setIdentityHints((prev) => ({ ...prev, galleryAssetIds: assetIds }))
                }
                allowMultiple
              />
              <label className="block text-sm font-medium text-foreground">
                Location
                <div className="mt-1">
                  <IdentityPagePicker
                    flatPages={locationPages}
                    lookupPages={flatPages}
                    value={locationPageId}
                    placeholder="Link a location page…"
                    onChange={setLocationPageId}
                  />
                </div>
              </label>
            </div>

            <div className={sectionClass}>
              <p className="text-sm font-medium text-foreground">Factions</p>
              {factionPageIds.length > 0 ? (
                <ul className="space-y-1">
                  {factionPageIds.map((pageId) => (
                    <li
                      key={pageId}
                      className="flex items-center justify-between rounded border border-border px-2 py-1 text-sm"
                    >
                      <span>{flatPages.find((p) => p.id === pageId)?.title ?? pageId}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFactionPageIds((prev) => prev.filter((id) => id !== pageId))
                        }
                        className="text-xs text-muted-foreground hover:text-red-400"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <IdentityPagePicker
                    flatPages={organizationPages}
                    lookupPages={flatPages}
                    value={addFactionId}
                    placeholder="Search organizations…"
                    onChange={setAddFactionId}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!addFactionId || factionPageIds.includes(addFactionId)) return;
                    setFactionPageIds((prev) => [...prev, addFactionId]);
                    setAddFactionId(null);
                  }}
                  disabled={!addFactionId}
                  className="shrink-0 rounded border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            <div className={sectionClass}>
              <p className="text-sm font-medium text-foreground">References</p>
              {references.length > 0 ? (
                <ul className="space-y-1">
                  {references.map((ref) => (
                    <li
                      key={ref.id}
                      className="flex items-center justify-between rounded border border-border px-2 py-1 text-sm"
                    >
                      <span>
                        {ref.title}{' '}
                        <span className="text-xs text-muted-foreground">({ref.type})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setReferences((prev) => prev.filter((entry) => entry.id !== ref.id))
                        }
                        className="text-xs text-muted-foreground hover:text-red-400"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <input
                type="text"
                value={newRefTitle}
                onChange={(event) => setNewRefTitle(event.target.value)}
                className={fieldClass}
                placeholder="Reference title"
              />
              <select
                value={newRefType}
                onChange={(event) => {
                  const type = event.target.value as HavenReferenceType;
                  setNewRefType(type);
                  if (type === 'external_doc') {
                    setNewRefTargetType('external');
                  } else if (type === 'image' || type === 'map' || type === 'vtt_scene') {
                    setNewRefTargetType('asset');
                  } else {
                    setNewRefTargetType('wiki_page');
                  }
                }}
                className={fieldClass}
              >
                {HAVEN_REFERENCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              {newRefType === 'external_doc' ? (
                <input
                  type="url"
                  value={newRefUrl}
                  onChange={(event) => setNewRefUrl(event.target.value)}
                  className={fieldClass}
                  placeholder="https://…"
                />
              ) : newRefTargetType === 'asset' ? (
                <HavenAssetIdField
                  campaignHandle={campaignHandle}
                  label="Asset"
                  value={newRefAssetId}
                  onChange={setNewRefAssetId}
                />
              ) : (
                <IdentityPagePicker
                  flatPages={wikiPickPages}
                  lookupPages={flatPages}
                  value={newRefTargetId}
                  placeholder="Link wiki page…"
                  onChange={setNewRefTargetId}
                />
              )}
            </div>

            <div className={sectionClass}>
              <p className="text-sm font-medium text-foreground">Spaces</p>
              {spaces.length > 0 ? (
                <ul className="space-y-1">
                  {spaces.map((space) => (
                    <li
                      key={space.id}
                      className="flex items-center justify-between rounded border border-border px-2 py-1 text-sm"
                    >
                      <span>{space.label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSpaces((prev) => prev.filter((entry) => entry.id !== space.id))
                        }
                        className="text-xs text-muted-foreground hover:text-red-400"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <input
                type="text"
                value={newSpaceLabel}
                onChange={(event) => setNewSpaceLabel(event.target.value)}
                className={fieldClass}
                placeholder="War Room, Forge Wing…"
              />
              <input
                type="text"
                value={newSpaceDescription}
                onChange={(event) => setNewSpaceDescription(event.target.value)}
                className={fieldClass}
                placeholder="Optional one-liner"
              />
            </div>

            <div className={sectionClass}>
              <p className="text-sm font-medium text-foreground">Related pages</p>
              {relatedPageIds.length > 0 ? (
                <ul className="space-y-1">
                  {relatedPageIds.map((pageId) => (
                    <li
                      key={pageId}
                      className="flex items-center justify-between rounded border border-border px-2 py-1 text-sm"
                    >
                      <span>{flatPages.find((p) => p.id === pageId)?.title ?? pageId}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setRelatedPageIds((prev) => prev.filter((id) => id !== pageId))
                        }
                        className="text-xs text-muted-foreground hover:text-red-400"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <IdentityPagePicker
                    flatPages={wikiPickPages}
                    lookupPages={flatPages}
                    value={addRelatedId}
                    placeholder="Search wiki pages…"
                    onChange={setAddRelatedId}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!addRelatedId || relatedPageIds.includes(addRelatedId)) return;
                    setRelatedPageIds((prev) => [...prev, addRelatedId]);
                    setAddRelatedId(null);
                  }}
                  disabled={!addRelatedId}
                  className="shrink-0 rounded border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            <div className={sectionClass}>
              <p className="text-sm font-medium text-foreground">Time simulation</p>
              <p className="text-xs text-muted-foreground">
                When enabled, this haven drifts with campaign time (opt-in per haven).
              </p>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={simulationEnabled}
                  onChange={(event) => setSimulationEnabled(event.target.checked)}
                />
                React to time passage
              </label>
              <label className="block text-sm font-medium text-foreground">
                Pause reason
                <input
                  type="text"
                  value={simulationPausedReason}
                  onChange={(event) => setSimulationPausedReason(event.target.value)}
                  className={fieldClass}
                  placeholder="Magical stasis, abandoned, GM lock…"
                />
              </label>
              {HAVEN_SIMULATION_AXES.map((axis) => {
                const bandIndex = bandIndexForValue(simulationAxes[axis]);
                const bands = listHavenSimulationBandLabels(axis);
                return (
                  <div key={axis} className="rounded border border-border/60 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {formatHavenSimulationAxisLabel(axis)}
                      </span>
                      <label className="flex items-center gap-1 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={lockedAxes[axis] === true}
                          onChange={(event) =>
                            setLockedAxes((prev) => ({
                              ...prev,
                              [axis]: event.target.checked ? true : undefined,
                            }))
                          }
                        />
                        Lock axis
                      </label>
                    </div>
                    <select
                      value={bandIndex}
                      onChange={(event) => {
                        const index = Number.parseInt(event.target.value, 10);
                        setSimulationAxes((prev) => ({
                          ...prev,
                          [axis]: axisValueForBandIndex(index),
                        }));
                      }}
                      className={fieldClass}
                    >
                      {bands.map((label, index) => (
                        <option key={label} value={index}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <details className={sectionClass}>
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                Treasury impact (optional)
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                Opt-in upkeep suggestions only fire on major status changes — never from routine
                simulation drift.
              </p>
              <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={ledgerUpkeepSuggestionsEnabled}
                  onChange={(event) =>
                    setLedgerUpkeepSuggestionsEnabled(event.target.checked)
                  }
                />
                Suggest ledger upkeep on major haven transitions
              </label>
              {upkeepCost.trim() && downtimeCategoryPageId ? (
                <button
                  type="button"
                  className="mt-3 text-sm font-medium text-primary hover:text-primary/90"
                  onClick={() => {
                    const amount = Number.parseInt(upkeepCost.trim(), 10);
                    if (!Number.isFinite(amount) || amount <= 0) return;
                    storeScheduledTreasuryPrefill({
                      effectKind: 'ledger_upkeep',
                      title: `${title.trim() || 'Haven'} upkeep`,
                      amount,
                      havenWikiPageId: wikiPageId,
                      recurrencePreset: 'monthly_calendar',
                    });
                    onClose();
                    navigate(
                      downtimeSectionHref(
                        campaignDowntimeHubPath(campaignHandle),
                        'ledger',
                      ),
                    );
                  }}
                >
                  Create recurring upkeep in Ledger
                </button>
              ) : null}
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm text-muted-foreground">
                  Upkeep cost
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    value={upkeepCost}
                    onChange={(event) =>
                      setUpkeepCost(event.target.value.replace(/[^\d]/g, ''))
                    }
                    placeholder="120"
                  />
                </label>
                <label className="block text-sm text-muted-foreground">
                  Construction cost
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    value={constructionCost}
                    onChange={(event) =>
                      setConstructionCost(event.target.value.replace(/[^\d]/g, ''))
                    }
                    placeholder="450"
                  />
                </label>
              </div>
            </details>

            <div className={sectionClass}>
              <p className="text-sm font-medium text-foreground">Crew</p>
              {crew.length > 0 ? (
                <ul className="space-y-1">
                  {crew.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center justify-between rounded border border-border px-2 py-1 text-sm"
                    >
                      <span>
                        {member.label}
                        {member.role ? ` (${member.role})` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCrew((prev) => prev.filter((entry) => entry.id !== member.id))
                        }
                        className="text-xs text-muted-foreground hover:text-red-400"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <input
                type="text"
                value={newCrewLabel}
                onChange={(event) => setNewCrewLabel(event.target.value)}
                className={fieldClass}
                placeholder="Role label"
              />
              <input
                type="text"
                value={newCrewRole}
                onChange={(event) => setNewCrewRole(event.target.value)}
                className={fieldClass}
                placeholder="Optional role detail"
              />
            </div>

            <div className={sectionClass}>
              <p className="text-sm font-medium text-foreground">Passive benefits</p>
              {passiveBenefits.length > 0 ? (
                <ul className="space-y-1">
                  {passiveBenefits.map((benefit) => (
                    <li
                      key={benefit.id}
                      className="flex items-center justify-between rounded border border-border px-2 py-1 text-sm"
                    >
                      <span>{benefit.label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setPassiveBenefits((prev) =>
                            prev.filter((entry) => entry.id !== benefit.id),
                          )
                        }
                        className="text-xs text-muted-foreground hover:text-red-400"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <input
                type="text"
                value={newBenefitLabel}
                onChange={(event) => setNewBenefitLabel(event.target.value)}
                className={fieldClass}
                placeholder="Safe harbor for smugglers"
              />
              <textarea
                value={newBenefitDescription}
                onChange={(event) => setNewBenefitDescription(event.target.value)}
                className={`${fieldClass} min-h-[48px] resize-y`}
                placeholder="Optional description"
              />
            </div>

            <div className={sectionClass}>
              <p className="text-sm font-medium text-foreground">Residents</p>
              {residentLabels.length > 0 ? (
                <ul className="space-y-1">
                  {residentLabels.map((resident) => (
                    <li
                      key={resident.id}
                      className="flex items-center justify-between rounded border border-border px-2 py-1 text-sm"
                    >
                      <span>{resident.title}</span>
                      <button
                        type="button"
                        onClick={() => removeResident(resident.id)}
                        className="text-xs text-muted-foreground hover:text-red-400"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No residents linked yet.</p>
              )}
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <IdentityPagePicker
                    flatPages={characterPages}
                    lookupPages={flatPages}
                    value={addResidentId}
                    placeholder="Search characters…"
                    onChange={setAddResidentId}
                  />
                </div>
                <button
                  type="button"
                  onClick={addResident}
                  disabled={!addResidentId}
                  className="shrink-0 rounded border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            <div className={sectionClass}>
              <p className="text-sm font-medium text-foreground">Record an update</p>
              <p className="text-xs text-muted-foreground">
                Adds a line to Recent changes on save.
              </p>
              <textarea
                value={activitySummary}
                onChange={(event) => setActivitySummary(event.target.value)}
                className={`${fieldClass} min-h-[64px] resize-y`}
                placeholder="Refugees arrived from the coast…"
              />
              <label className="block text-sm font-medium text-foreground">
                Tone
                <select
                  value={activityTone}
                  onChange={(event) =>
                    setActivityTone(
                      event.target.value as 'neutral' | 'warning' | 'escalation' | '',
                    )
                  }
                  className={fieldClass}
                >
                  <option value="">Neutral</option>
                  <option value="warning">Warning</option>
                  <option value="escalation">Escalation</option>
                </select>
              </label>
            </div>

            <div className={sectionClass}>
              <p className="text-sm font-medium text-foreground">Add threat</p>
              <input
                type="text"
                value={newThreatLabel}
                onChange={(event) => setNewThreatLabel(event.target.value)}
                className={fieldClass}
                placeholder="City watch suspicion"
              />
              <select
                value={newThreatSeverity}
                onChange={(event) =>
                  setNewThreatSeverity(event.target.value as HavenThreatSeverity | '')
                }
                className={fieldClass}
              >
                <option value="">Severity optional</option>
                {HAVEN_THREAT_SEVERITIES.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry.charAt(0).toUpperCase() + entry.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className={sectionClass}>
              <p className="text-sm font-medium text-foreground">Add improvement</p>
              <input
                type="text"
                value={newUpgradeLabel}
                onChange={(event) => setNewUpgradeLabel(event.target.value)}
                className={fieldClass}
                placeholder="Hidden smuggler docks"
              />
              <textarea
                value={newUpgradeDescription}
                onChange={(event) => setNewUpgradeDescription(event.target.value)}
                className={`${fieldClass} min-h-[48px] resize-y`}
                placeholder="Optional description"
              />
            </div>

            {error ? (
              <p className="rounded bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
