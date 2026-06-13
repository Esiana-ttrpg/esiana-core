import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Inbox, List, Shield, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { campaignSettingsPath } from '@/lib/campaignPaths';
import { isCampaignScheduleConfigured } from '@/lib/recruitmentReadiness';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ResponsiveSectionNav } from '@/components/settings/ResponsiveSectionNav';
import {
  fetchCampaign,
  fetchCampaignJoinRequests,
  respondToCampaignJoinRequest,
  updateCampaignSettings,
} from '@/lib/campaigns';
import { fetchWikiTreePayload, flattenWikiTree } from '@/lib/wiki';
import type { CampaignJoinRequestRow } from '@/types/recruitment';
import { CampaignThemeMultiSelect } from '@/components/campaign/CampaignThemeMultiSelect';
import { GmStyleTagMultiSelect } from '@/components/settings/GmStyleTagMultiSelect';
import { JoinRequestDeclineDialog } from '@/components/recruitment/JoinRequestDeclineDialog';
import { JoinRequestReviewCard } from '@/components/recruitment/JoinRequestReviewCard';
import { RECRUITMENT_BEFORE_APPLY_NOTE_MAX } from '@/components/recruitment/RecruitmentBeforeApplyNote';
import { controlClasses } from '@/components/ui/formStyles';
import {
  normalizeRecruitmentDocTitle,
  RECRUITMENT_DOC_ALIASES,
} from '@shared/recruitmentDocAliases';

interface RecruitmentSettingsTabProps {
  campaignHandle: string;
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border/80 pb-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
    </div>
  );
}

function StatusDot({ state }: { state: 'configured' | 'needsSetup' }) {
  const color =
    state === 'configured' ? 'bg-emerald-500/70' : 'bg-muted-foreground/40';
  return <span className={`inline-block size-1.5 shrink-0 rounded-full ${color}`} aria-hidden />;
}

export function RecruitmentSettingsTab({ campaignHandle }: RecruitmentSettingsTabProps) {
  const [activeSection, setActiveSection] = useState<
    'listing' | 'tablePreferences' | 'safetyTools' | 'applications'
  >('listing');
  const [campaignId, setCampaignId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [isLookingForGroup, setIsLookingForGroup] = useState(false);
  const [scheduleReadiness, setScheduleReadiness] = useState({
    scheduleFrequency: '',
    scheduleDay: '',
    scheduleTime: '',
  });
  const [maxSeats, setMaxSeats] = useState(4);
  const [maxPlayers, setMaxPlayers] = useState(5);
  const [genreThemes, setGenreThemes] = useState<string[]>([]);
  const [externalTools, setExternalTools] = useState<string[]>([]);
  const [externalToolsInput, setExternalToolsInput] = useState('');
  const [safetyTools, setSafetyTools] = useState('');
  const [contentWarnings, setContentWarnings] = useState('');
  const [equipmentNeeded, setEquipmentNeeded] = useState('');
  const [recruitmentTagline, setRecruitmentTagline] = useState('');
  const [recruitmentPremise, setRecruitmentPremise] = useState('');
  const [recruitmentBeforeApplyNote, setRecruitmentBeforeApplyNote] = useState('');
  const [tableStyleTags, setTableStyleTags] = useState<string[]>([]);
  const [campaignType, setCampaignType] = useState('');
  const [experienceRequired, setExperienceRequired] = useState('');
  const [ageRestriction, setAgeRestriction] = useState('');
  const [levelRange, setLevelRange] = useState('');
  const [recruitmentLanguage, setRecruitmentLanguage] = useState('');
  const [includeRules, setIncludeRules] = useState(false);
  const [includeFAQ, setIncludeFAQ] = useState(false);
  const [includeSessionZero, setIncludeSessionZero] = useState(false);
  const [includeHomebrew, setIncludeHomebrew] = useState(false);
  const [includeSafetyGuidelines, setIncludeSafetyGuidelines] = useState(false);
  const [includeCharacterCreation, setIncludeCharacterCreation] = useState(false);
  const [includeTableExpectations, setIncludeTableExpectations] = useState(false);
  const [availableRecruitmentDocs, setAvailableRecruitmentDocs] = useState({
    tableExpectations: false,
    rules: false,
    faq: false,
    sessionZero: false,
    homebrew: false,
    safetyGuidelines: false,
    characterCreation: false,
  });

  const [requests, setRequests] = useState<CampaignJoinRequestRow[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<CampaignJoinRequestRow | null>(null);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const list = await fetchCampaignJoinRequests(campaignHandle);
      setRequests(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load join requests.',
      );
    } finally {
      setRequestsLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const campaign = await fetchCampaign(campaignHandle);
        if (cancelled) return;
        setCampaignId(campaign.id);
        setIsLookingForGroup(campaign.isLookingForGroup ?? false);
        setScheduleReadiness({
          scheduleFrequency: campaign.scheduleFrequency ?? '',
          scheduleDay: campaign.scheduleDay ?? '',
          scheduleTime: campaign.scheduleTime ?? '',
        });
        setMaxSeats(campaign.maxSeats ?? 0);
        setMaxPlayers(campaign.maxPlayers ?? 5);
        setGenreThemes(campaign.genreThemes ?? []);
        setExternalTools(campaign.externalTools ?? []);
        setSafetyTools(campaign.safetyTools ?? '');
        setContentWarnings(campaign.contentWarnings ?? '');
        setEquipmentNeeded(campaign.equipmentNeeded ?? '');
        setRecruitmentTagline(campaign.recruitmentTagline ?? '');
        setRecruitmentPremise(campaign.recruitmentPremise ?? '');
        setRecruitmentBeforeApplyNote(campaign.recruitmentBeforeApplyNote ?? '');
        setTableStyleTags(campaign.tableStyleTags ?? []);
        setCampaignType(
          campaign.campaignFormat ??
            campaign.recruitmentSettings?.campaignFormat ??
            campaign.recruitmentSettings?.type ??
            '',
        );
        setExperienceRequired(
          campaign.experienceRequired ?? campaign.recruitmentSettings?.experienceRequired ?? '',
        );
        setAgeRestriction(
          campaign.ageRestriction ?? campaign.recruitmentSettings?.ageRestriction ?? '',
        );
        setLevelRange(campaign.levelRange ?? campaign.recruitmentSettings?.levelRange ?? '');
        setRecruitmentLanguage(
          campaign.language ?? campaign.recruitmentSettings?.language ?? '',
        );
        setIncludeRules(campaign.includeRules ?? false);
        setIncludeFAQ(campaign.includeFAQ ?? false);
        setIncludeSessionZero(campaign.includeSessionZero ?? false);
        setIncludeHomebrew(campaign.includeHomebrew ?? false);
        setIncludeSafetyGuidelines(campaign.includeSafetyGuidelines ?? false);
        setIncludeCharacterCreation(campaign.includeCharacterCreation ?? false);
        setIncludeTableExpectations(campaign.includeTableExpectations ?? false);

        const wiki = await fetchWikiTreePayload(campaignHandle);
        if (cancelled) return;
        const titles = new Set(
          flattenWikiTree(wiki.tree).map((node) => normalizeRecruitmentDocTitle(node.title)),
        );
        const hasAnyAlias = (aliases: readonly string[]) =>
          aliases.some((alias) => titles.has(normalizeRecruitmentDocTitle(alias)));
        const availability = {
          tableExpectations: hasAnyAlias(RECRUITMENT_DOC_ALIASES.tableExpectations),
          rules: hasAnyAlias(RECRUITMENT_DOC_ALIASES.rules),
          faq: hasAnyAlias(RECRUITMENT_DOC_ALIASES.faq),
          sessionZero: hasAnyAlias(RECRUITMENT_DOC_ALIASES.sessionZero),
          homebrew: hasAnyAlias(RECRUITMENT_DOC_ALIASES.homebrew),
          safetyGuidelines: hasAnyAlias(RECRUITMENT_DOC_ALIASES.safetyGuidelines),
          characterCreation: hasAnyAlias(RECRUITMENT_DOC_ALIASES.characterCreation),
        };
        setAvailableRecruitmentDocs(availability);
        if (!availability.tableExpectations) setIncludeTableExpectations(false);
        if (!availability.rules) setIncludeRules(false);
        if (!availability.faq) setIncludeFAQ(false);
        if (!availability.sessionZero) setIncludeSessionZero(false);
        if (!availability.homebrew) setIncludeHomebrew(false);
        if (!availability.safetyGuidelines) setIncludeSafetyGuidelines(false);
        if (!availability.characterCreation) setIncludeCharacterCreation(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load recruitment settings.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, [campaignHandle, loadRequests]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!campaignId) {
      setError('Campaign is still loading. Please try again.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateCampaignSettings(campaignId, {
        isLookingForGroup,
        maxSeats: Number(maxSeats) || 0,
        maxPlayers: Number(maxPlayers) || 5,
        genreThemes,
        externalTools,
        safetyTools: safetyTools.trim() || null,
        contentWarnings: contentWarnings.trim() || null,
        equipmentNeeded: equipmentNeeded.trim() || null,
        recruitmentTagline: recruitmentTagline.trim() || null,
        recruitmentPremise: recruitmentPremise.trim() || null,
        recruitmentBeforeApplyNote: recruitmentBeforeApplyNote.trim() || null,
        tableStyleTags,
        campaignFormat: campaignType || null,
        experienceRequired: experienceRequired || null,
        ageRestriction: ageRestriction || null,
        levelRange: levelRange.trim() || null,
        language: recruitmentLanguage.trim() || null,
        includeRules: availableRecruitmentDocs.rules ? includeRules : false,
        includeFAQ: availableRecruitmentDocs.faq ? includeFAQ : false,
        includeSessionZero: availableRecruitmentDocs.sessionZero
          ? includeSessionZero
          : false,
        includeHomebrew: availableRecruitmentDocs.homebrew ? includeHomebrew : false,
        includeSafetyGuidelines: availableRecruitmentDocs.safetyGuidelines
          ? includeSafetyGuidelines
          : false,
        includeCharacterCreation: availableRecruitmentDocs.characterCreation
          ? includeCharacterCreation
          : false,
        includeTableExpectations: availableRecruitmentDocs.tableExpectations
          ? includeTableExpectations
          : false,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recruitment settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAccept(requestId: string) {
    if (!campaignId) return;
    setActingId(requestId);
    setError(null);
    try {
      await respondToCampaignJoinRequest(campaignId, requestId, 'ACCEPTED');
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to accept application.');
    } finally {
      setActingId(null);
    }
  }

  async function handleDeclineConfirm(payload: {
    declineReasonCode: string;
    declineMessage: string;
  }) {
    if (!campaignId || !declineTarget) return;
    setActingId(declineTarget.id);
    setError(null);
    try {
      await respondToCampaignJoinRequest(campaignId, declineTarget.id, 'REJECTED', payload);
      setDeclineTarget(null);
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to decline application.');
    } finally {
      setActingId(null);
    }
  }

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const showAnyDocToggle =
    availableRecruitmentDocs.tableExpectations ||
    availableRecruitmentDocs.rules ||
    availableRecruitmentDocs.faq ||
    availableRecruitmentDocs.sessionZero ||
    availableRecruitmentDocs.homebrew ||
    availableRecruitmentDocs.safetyGuidelines ||
    availableRecruitmentDocs.characterCreation;
  const sectionTabs = [
    { id: 'listing' as const, label: 'Listing', icon: List },
    { id: 'tablePreferences' as const, label: 'Table Preferences', icon: Users },
    { id: 'safetyTools' as const, label: 'Safety & Tools', icon: Shield },
    { id: 'applications' as const, label: 'Applications', icon: Inbox },
  ];
  const listingIdentityConfigured =
    recruitmentPremise.trim().length > 0 ||
    recruitmentTagline.trim().length > 0 ||
    recruitmentBeforeApplyNote.trim().length > 0 ||
    campaignType.trim().length > 0 ||
    genreThemes.length > 0 ||
    tableStyleTags.length > 0;
  const scheduleConfigured = isCampaignScheduleConfigured(scheduleReadiness);
  const tablePreferencesConfigured =
    experienceRequired.trim().length > 0 ||
    ageRestriction.trim().length > 0 ||
    recruitmentLanguage.trim().length > 0;
  const safetyToolsConfigured =
    safetyTools.trim().length > 0 ||
    contentWarnings.trim().length > 0 ||
    externalTools.length > 0;

  const configuredItems: string[] = [];
  const needsSetupItems: string[] = ['DM profile'];
  if (scheduleConfigured) configuredItems.push('Schedule');
  else needsSetupItems.push('Schedule');
  if (tablePreferencesConfigured) configuredItems.push('Table preferences');
  else needsSetupItems.push('Table preferences');
  if (safetyToolsConfigured) configuredItems.push('Safety & tools');
  else needsSetupItems.push('Safety & tools');
  if (listingIdentityConfigured) configuredItems.push('Campaign identity');
  else if (isLookingForGroup) needsSetupItems.push('Campaign identity');

  if (loading) {
    return <LoadingSpinner label="Loading recruitment settings…" />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="size-5 text-primary" />
          <h2 className="text-lg font-semibold text-white">Recruitment Settings</h2>
        </div>
        <div className="mb-5 rounded-lg border border-border/80 bg-background/40 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground">Marketplace Listing</h3>
              <p className="mt-1 text-sm text-muted">
                Your campaign uses your public DM profile and recruitment settings when listed
                publicly.
              </p>
            </div>
            <Link
              to="/settings"
              className="shrink-0 text-sm font-medium text-primary hover:text-primary-hover"
            >
              Update DM profile
            </Link>
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isLookingForGroup}
              onChange={(e) => setIsLookingForGroup(e.target.checked)}
              className="rounded border-border"
            />
            Actively recruiting players (LFG)
          </label>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
            {configuredItems.length > 0 ? (
              <div>
                <p className="mb-1 font-medium text-foreground/80">Configured</p>
                <ul className="space-y-1">
                  {configuredItems.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-foreground">
                      <StatusDot state="configured" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {needsSetupItems.length > 0 ? (
              <div>
                <p className="mb-1 font-medium text-foreground/80">Needs setup</p>
                <ul className="space-y-1">
                  {needsSetupItems.map((item) => (
                    <li key={item} className="flex flex-wrap items-center gap-2 text-foreground">
                      <StatusDot state="needsSetup" />
                      <span>{item}</span>
                      {item === 'Schedule' ? (
                        <Link
                          to={campaignSettingsPath(campaignHandle, 'scheduling')}
                          className="text-xs font-medium text-primary hover:text-primary-hover"
                        >
                          Go to Scheduling
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <ResponsiveSectionNav
          sections={sectionTabs}
          activeId={activeSection}
          onChange={setActiveSection}
          ariaLabel="Recruitment settings sections"
          mobileLabel="Recruitment section"
        />

        <form onSubmit={handleSave} className="space-y-6">
          {activeSection === 'listing' ? (
            <>
              <SectionHeader
                title="Listing pitch"
                description="Tagline hooks browsers in one line; premise is the story applicants get excited about."
              />
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-muted">Tagline</label>
                  <input
                    type="text"
                    value={recruitmentTagline}
                    onChange={(e) => setRecruitmentTagline(e.target.value)}
                    placeholder="A dying kingdom held together by fragile dragon treaties."
                    className={controlClasses}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Campaign premise (markdown)</label>
                  <textarea
                    value={recruitmentPremise}
                    onChange={(e) => setRecruitmentPremise(e.target.value)}
                    rows={6}
                    placeholder="2–5 paragraphs: tone, fantasy hook, and what playing here feels like."
                    className="w-full rounded border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">
                    Before you apply (plain text)
                  </label>
                  <p className="mb-2 text-xs text-muted">
                    Honest vibe disclosure near the apply button — pacing, energy, seriousness. Not
                    premise fantasy or long-form table expectations.
                  </p>
                  <textarea
                    value={recruitmentBeforeApplyNote}
                    onChange={(e) =>
                      setRecruitmentBeforeApplyNote(
                        e.target.value.slice(0, RECRUITMENT_BEFORE_APPLY_NOTE_MAX),
                      )
                    }
                    rows={4}
                    maxLength={RECRUITMENT_BEFORE_APPLY_NOTE_MAX}
                    placeholder="e.g. We play weekly with a focus on character drama; sessions run 3–4 hours and we keep combat brisk."
                    className="w-full rounded border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary"
                  />
                  <p className="mt-1 text-right text-xs text-muted">
                    {recruitmentBeforeApplyNote.length}/{RECRUITMENT_BEFORE_APPLY_NOTE_MAX}
                  </p>
                </div>
              </div>

              <SectionHeader
                title="Table style"
                description="How playing at this table feels — shown as chips on your public listing."
              />
              <GmStyleTagMultiSelect values={tableStyleTags} onChange={setTableStyleTags} />

              <SectionHeader
                title="Campaign identity"
                description="Format and genre themes for directory browsing."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted">Campaign Format</label>
                  <select
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className={controlClasses}
                  >
                    <option value="">Select format</option>
                    <option value="Campaign">Campaign</option>
                    <option value="One-shot">One-shot</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Genre themes</label>
                  <CampaignThemeMultiSelect
                    values={genreThemes}
                    onChange={setGenreThemes}
                    inputClassName={controlClasses}
                    compact
                  />
                </div>
              </div>

              <SectionHeader
                title="Public recruitment resources"
                description="Choose which campaign documents applicants can view."
              />
              <div>
                {showAnyDocToggle ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {availableRecruitmentDocs.tableExpectations ? (
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={includeTableExpectations}
                          onChange={(e) => setIncludeTableExpectations(e.target.checked)}
                          className="rounded border-border"
                        />
                        Table Expectations
                      </label>
                    ) : null}
                    {availableRecruitmentDocs.rules ? (
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input type="checkbox" checked={includeRules} onChange={(e) => setIncludeRules(e.target.checked)} className="rounded border-border" />
                        Rules &amp; Expectations
                      </label>
                    ) : null}
                    {availableRecruitmentDocs.faq ? (
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input type="checkbox" checked={includeFAQ} onChange={(e) => setIncludeFAQ(e.target.checked)} className="rounded border-border" />
                        FAQ
                      </label>
                    ) : null}
                    {availableRecruitmentDocs.sessionZero ? (
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input type="checkbox" checked={includeSessionZero} onChange={(e) => setIncludeSessionZero(e.target.checked)} className="rounded border-border" />
                        Session Zero
                      </label>
                    ) : null}
                    {availableRecruitmentDocs.homebrew ? (
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input type="checkbox" checked={includeHomebrew} onChange={(e) => setIncludeHomebrew(e.target.checked)} className="rounded border-border" />
                        Homebrew Content
                      </label>
                    ) : null}
                    {availableRecruitmentDocs.safetyGuidelines ? (
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={includeSafetyGuidelines}
                          onChange={(e) => setIncludeSafetyGuidelines(e.target.checked)}
                          className="rounded border-border"
                        />
                        Safety Guidelines
                      </label>
                    ) : null}
                    {availableRecruitmentDocs.characterCreation ? (
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={includeCharacterCreation}
                          onChange={(e) => setIncludeCharacterCreation(e.target.checked)}
                          className="rounded border-border"
                        />
                        Character Creation Guide
                      </label>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    If you create notes that match recruitment resource names (for example Table Expectations, Rules, FAQ, Session Zero, Homebrew, Safety Guidelines, or Character Creation Guide), you can toggle them here to display publicly to recruiting players.
                  </p>
                )}
              </div>
            </>
          ) : null}

          {activeSection === 'tablePreferences' ? (
            <>
              <SectionHeader
                title="Player fit"
                description="Who this table is for and how applicants should prepare."
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs text-muted">Experience</label>
                  <select
                    value={experienceRequired}
                    onChange={(e) => setExperienceRequired(e.target.value)}
                    className={controlClasses}
                  >
                    <option value="">Select experience</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Experienced">Experienced</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Age Restriction</label>
                  <select
                    value={ageRestriction}
                    onChange={(e) => setAgeRestriction(e.target.value)}
                    className={controlClasses}
                  >
                    <option value="">Select age range</option>
                    <option value="18+">18+</option>
                    <option value="All Ages">All Ages</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Language</label>
                  <input
                    type="text"
                    value={recruitmentLanguage}
                    onChange={(e) => setRecruitmentLanguage(e.target.value)}
                    placeholder="English"
                    className={controlClasses}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Level Range</label>
                  <input
                    type="text"
                    value={levelRange}
                    onChange={(e) => setLevelRange(e.target.value)}
                    placeholder="10-16"
                    className={controlClasses}
                  />
                </div>
              </div>
              <SectionHeader
                title="Table size"
                description="Party size is your full table. Recruiting for is how many open spots you list in LFG."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted">Party size</label>
                  <input
                    type="number"
                    min={1}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className={controlClasses}
                  />
                  <p className="mt-1 text-xs text-muted">
                    Total player characters at the table (including seats already filled).
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">Recruiting for</label>
                  <input
                    type="number"
                    min={0}
                    value={maxSeats}
                    onChange={(e) => setMaxSeats(Number(e.target.value))}
                    className={controlClasses}
                  />
                  <p className="mt-1 text-xs text-muted">
                    Players you want to add through recruitment. Leave at 0 to use party size on listings.
                  </p>
                </div>
              </div>
            </>
          ) : null}

          {activeSection === 'safetyTools' ? (
            <>
              <SectionHeader
                title="Table safety"
                description="Safety tools and content boundaries for applicants."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <textarea value={contentWarnings} onChange={(e) => setContentWarnings(e.target.value)} rows={3} placeholder="Content warnings" className="w-full rounded border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary" />
                <textarea value={safetyTools} onChange={(e) => setSafetyTools(e.target.value)} rows={3} placeholder="Safety tools (e.g. lines & veils, X-card)" className="w-full rounded border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary" />
              </div>
              <SectionHeader
                title="Tools & equipment"
                description="External tools and what players need at the table."
              />
              <div>
                <label className="mb-1 block text-xs text-muted">External tools</label>
                <input
                  type="text"
                  value={externalToolsInput}
                  onChange={(e) => setExternalToolsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const v = externalToolsInput.trim();
                      if (v && !externalTools.includes(v)) setExternalTools([...externalTools, v]);
                      setExternalToolsInput('');
                    }
                  }}
                  placeholder="Discord, Foundry VTT, Roll20"
                  className={controlClasses}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {externalTools.map((item) => (
                    <button key={item} type="button" onClick={() => setExternalTools(externalTools.filter((x) => x !== item))} className="rounded-full border border-border bg-surface px-2 py-1 text-xs text-foreground">{item}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Equipment needed</label>
                <textarea value={equipmentNeeded} onChange={(e) => setEquipmentNeeded(e.target.value)} rows={2} placeholder="Dice, mic, character sheet, etc." className="w-full rounded border border-border bg-elevated px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary" />
              </div>
            </>
          ) : null}

          {error && (
            <p className="rounded border border-red-700 bg-red-950/50 p-3 text-sm text-red-200">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded border border-emerald-700 bg-emerald-950/50 p-3 text-sm text-emerald-200">
              Recruitment settings saved.
            </p>
          )}

          {activeSection !== 'applications' ? (
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded border border-border bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover disabled:bg-elevated"
            >
              {saving ? 'Saving…' : 'Save Recruitment Settings'}
            </button>
          ) : null}
        </form>
      </div>

      {activeSection === 'applications' ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <SectionHeader
            title="Pending applications"
            description="Review and accept or decline join requests."
          />

          {requestsLoading ? (
            <LoadingSpinner label="Loading applications…" />
          ) : pendingRequests.length === 0 ? (
            <p className="text-sm text-muted">No pending applications.</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <JoinRequestReviewCard
                  key={request.id}
                  request={request}
                  acting={actingId === request.id}
                  onAccept={() => handleAccept(request.id)}
                  onDecline={() => setDeclineTarget(request)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      <JoinRequestDeclineDialog
        applicantLabel={declineTarget?.user.label ?? 'this applicant'}
        open={declineTarget !== null}
        saving={actingId === declineTarget?.id}
        onClose={() => setDeclineTarget(null)}
        onConfirm={handleDeclineConfirm}
      />
    </div>
  );
}
