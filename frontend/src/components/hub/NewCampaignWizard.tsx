import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  Archive,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileArchive,
  FolderTree,
  Globe,
  Link2,
  Lock,
  Map as MapIcon,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import { SiObsidian } from 'react-icons/si';
import { FantasyCalendarImportZone } from '@/components/chronology/FantasyCalendarImportZone';
import { createCampaignWithWizard } from '@/lib/campaigns';
import { fetchContentPacks, type ContentPackCard } from '@/lib/contentPacks';
import {
  fetchImportProviders,
  type PluginImportProviderCard,
} from '@/lib/importProviders';
import { fetchSampleDataProfiles, type SampleDataProfileCard } from '@/lib/sampleData';
import { getCampaignFormatLabel } from '@shared/campaignFormat';
import { GameSystemSelect, getGameSystemLabel } from '@/components/campaign/GameSystemSelect';
import {
  CampaignThemeMultiSelect,
  getCampaignThemeLabel,
} from '@/components/campaign/CampaignThemeMultiSelect';
import type { CampaignDiscoverabilityValue, CampaignSummary } from '@/types/campaign';
import { CampaignDiscoverability } from '@shared/campaignPolicy/discoverability';
import { fetchUserCampaignDefaults } from '@/lib/userCampaignDefaults';
import { docsLinks } from '@/lib/docsLinks';
import type { UserTemplateResourceKind } from '@/types/userCampaignDefaults';
type MappingTarget =
  | 'Characters'
  | 'Bestiary'
  | 'Ancestries'
  | 'Organizations'
  | 'Locations'
  | 'Maps'
  | 'Objects'
  | 'Families (tree)'
  | 'Game/Rules & Resources'
  | 'Game/Quests'
  | 'Game/Session Notes'
  | 'Game/Journals'
  | 'Game/Calendars'
  | 'Game/Timelines'
  | 'Game/Events'
  | 'Wiki/Generic'
  | 'Ignore Folder';

interface FolderMapping {
  sourceFolderName: string;
  targetModule: MappingTarget | '';
  isAutoMatched: boolean;
}

interface NewCampaignWizardPayload {
  identity: {
    title: string;
    description: string;
    gameSystem: string;
    customGameSystemName: string | null;
    coverImage: File | null;
    genreThemes: string[];
  };
  imports: {
    campaignSource: 'blank' | 'obsidian' | 'esiana-backup' | 'contentPack' | 'sampleData';
    contentPack: { pluginId: string; packId: string } | null;
    sampleDataProfile: { profileId: string } | null;
    importSource: 'none' | 'obsidian' | 'esiana-backup';
    markdownZipFile: File | null;
    backupZipFile: File | null;
    calendarConfigFile: File | null;
    folderMappings: FolderMapping[];
    sampleDataSeed: string;
    sampleDataDensity: 'quiet' | 'active' | 'obsessive';
  };
  access: {
    discoverability: CampaignDiscoverabilityValue;
  };
  importDefaults: {
    tableExpectations: boolean;
    safetyGuidelines: boolean;
    sessionZero: boolean;
    houseRules: boolean;
    recruitmentPreferences: boolean;
  };
}

interface NewCampaignWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated: (campaign: CampaignSummary) => void;
}

const INITIAL_PAYLOAD: NewCampaignWizardPayload = {
  identity: {
    title: '',
    description: '',
    gameSystem: 'dnd-5e',
    customGameSystemName: null,
    coverImage: null,
    genreThemes: [],
  },
  imports: {
    campaignSource: 'blank',
    contentPack: null,
    sampleDataProfile: null,
    importSource: 'none',
    markdownZipFile: null,
    backupZipFile: null,
    calendarConfigFile: null,
    folderMappings: [],
    sampleDataSeed: '',
    sampleDataDensity: 'active',
  },
  access: {
    discoverability: CampaignDiscoverability.PRIVATE,
  },
  importDefaults: {
    tableExpectations: false,
    safetyGuidelines: false,
    sessionZero: false,
    houseRules: false,
    recruitmentPreferences: false,
  },
};

const STEPS = ['Core Identity', 'Campaign Source', 'Access & Review'] as const;
const MODULE_TARGETS: MappingTarget[] = [
  'Characters',
  'Bestiary',
  'Ancestries',
  'Organizations',
  'Locations',
  'Maps',
  'Objects',
  'Families (tree)',
  'Game/Rules & Resources',
  'Game/Quests',
  'Game/Session Notes',
  'Game/Journals',
  'Game/Calendars',
  'Game/Timelines',
  'Game/Events',
  'Wiki/Generic',
  'Ignore Folder',
];

const WIKI_IMPORT_SOURCES = [
  {
    id: 'obsidian',
    label: 'Obsidian',
    description: 'Upload a vault export (.zip of Markdown notes).',
    planned: false,
    Icon: SiObsidian,
  },
  {
    id: 'kanka',
    label: 'Kanka.io',
    description: 'Import entities from a Kanka campaign.',
    planned: true,
    Icon: MapIcon,
  },
  {
    id: 'esiana-backup',
    label: 'Esiana backup',
    description: 'Restore a prior Esiana campaign backup (.zip).',
    planned: false,
    Icon: Archive,
  },
];

const MODULE_SYNONYMS: Array<{
  target: Exclude<MappingTarget, 'Wiki/Generic' | 'Ignore Folder'>;
  synonyms: string[];
}> = [
  { target: 'Characters', synonyms: ['npcs', 'characters', 'people', 'pc'] },
  { target: 'Bestiary', synonyms: ['monsters', 'bestiary', 'creatures', 'enemies'] },
  { target: 'Ancestries', synonyms: ['races', 'ancestries', 'lineages', 'species'] },
  {
    target: 'Organizations',
    synonyms: ['factions', 'guilds', 'organizations', 'sects'],
  },
  { target: 'Locations', synonyms: ['locations', 'settlements', 'cities', 'world'] },
  { target: 'Maps', synonyms: ['maps', 'cartography', 'scenes'] },
  { target: 'Objects', synonyms: ['items', 'artifacts', 'loot', 'objects'] },
  { target: 'Families (tree)', synonyms: ['houses', 'families', 'dynasties'] },
  {
    target: 'Game/Rules & Resources',
    synonyms: ['rules', 'mechanics', 'handouts'],
  },
  { target: 'Game/Quests', synonyms: ['quests', 'missions', 'plots'] },
  {
    target: 'Game/Session Notes',
    synonyms: ['session notes', 'sessions', 'recaps', 'logs'],
  },
  { target: 'Game/Journals', synonyms: ['journals', 'personal logs', 'diaries'] },
  { target: 'Game/Calendars', synonyms: ['calendar', 'calendars'] },
  { target: 'Game/Timelines', synonyms: ['timeline', 'timelines'] },
  { target: 'Game/Events', synonyms: ['events'] },
];

function sanitizeForSearch(value: string): string {
  return value.trim().toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ');
}

function inferFoldersFromZipFilename(filename: string): string[] {
  const cleaned = filename.replace(/\.zip$/i, '');
  const tokens = sanitizeForSearch(cleaned)
    .split(/[\s,;:|]+/)
    .filter((token) => token.length > 2);

  const seeded = [
    'Characters',
    'Locations',
    'Session Notes',
    'Quests',
    'Maps',
    ...tokens,
  ];

  return Array.from(
    new Set(
      seeded
        .map((folder) => folder.trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );
}

function fuzzyMatchTarget(sourceFolderName: string): MappingTarget | '' {
  const source = sanitizeForSearch(sourceFolderName);
  for (const entry of MODULE_SYNONYMS) {
    const found = entry.synonyms.some((synonym) => {
      const candidate = sanitizeForSearch(synonym);
      return source.includes(candidate) || candidate.includes(source);
    });
    if (found) return entry.target;
  }
  return '';
}

export function NewCampaignWizard({
  open,
  onClose,
  onCreated,
}: NewCampaignWizardProps) {
  const [step, setStep] = useState(0);
  const [payload, setPayload] = useState<NewCampaignWizardPayload>(INITIAL_PAYLOAD);
  const [coverDragOver, setCoverDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const markdownZipInputRef = useRef<HTMLInputElement | null>(null);
  const backupZipInputRef = useRef<HTMLInputElement | null>(null);
  const [defaultsAvailable, setDefaultsAvailable] = useState({
    tableExpectations: false,
    safetyGuidelines: false,
    sessionZero: false,
    houseRules: false,
    recruitmentPreferences: false,
  });
  const [contentPackCards, setContentPackCards] = useState<ContentPackCard[]>([]);
  const [pluginImportProviders, setPluginImportProviders] = useState<PluginImportProviderCard[]>(
    [],
  );
  const [sampleDataProfiles, setSampleDataProfiles] = useState<SampleDataProfileCard[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([fetchContentPacks(), fetchSampleDataProfiles(), fetchImportProviders()])
      .then(([packs, profiles, importProviders]) => {
        if (cancelled) return;
        setContentPackCards(packs);
        setSampleDataProfiles(profiles);
        setPluginImportProviders(importProviders.plugins ?? []);
      })
      .catch(() => {
        /* optional — blank/import still work */
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchUserCampaignDefaults()
      .then((bundle) => {
        if (cancelled) return;
        const byKind = new Map(bundle.templateResources.map((row) => [row.kind, row]));
        const hasSafety = byKind.get('safetyGuidelines')?.hasContent ?? false;
        const hasSessionZero = byKind.get('sessionZero')?.hasContent ?? false;
        const hasRules = byKind.get('rules')?.hasContent ?? false;
        const hasTableExpectations = byKind.get('tableExpectations')?.hasContent ?? false;
        const hasRecruitmentPrefs =
          (bundle.prefs.recruitmentPrefs?.genreThemes?.length ?? 0) > 0 ||
          Object.values(bundle.prefs.safetyDefaults ?? {}).some(Boolean) ||
          Boolean(bundle.prefs.recruitmentPrefs?.safetyToolsText?.trim()) ||
          Boolean(bundle.defaultPitch?.trim());

        setDefaultsAvailable({
          tableExpectations: hasTableExpectations,
          safetyGuidelines: hasSafety,
          sessionZero: hasSessionZero,
          houseRules: hasRules,
          recruitmentPreferences: hasRecruitmentPrefs,
        });

        setPayload((current) => ({
          ...current,
          importDefaults: {
            tableExpectations: hasTableExpectations,
            safetyGuidelines: hasSafety,
            sessionZero: hasSessionZero,
            houseRules: hasRules,
            recruitmentPreferences: hasRecruitmentPrefs,
          },
        }));
      })
      .catch(() => {
        /* optional — wizard works without saved defaults */
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const titleMissing = !payload.identity.title.trim();
  const customGameSystemMissing =
    payload.identity.gameSystem === 'other' &&
    !payload.identity.customGameSystemName?.trim();
  const hasUnmappedFolders =
    payload.imports.importSource === 'obsidian' &&
    payload.imports.folderMappings.some((mapping) => !mapping.targetModule);
  const wizardErrors = {
    titleMissing,
    customGameSystemMissing,
    hasUnmappedFolders,
  };
  const isValid =
    !wizardErrors.titleMissing &&
    !wizardErrors.customGameSystemMissing &&
    !wizardErrors.hasUnmappedFolders;

  const summaryItems = useMemo(
    () => [
      `Title: ${payload.identity.title || '—'}`,
      `Game System: ${getGameSystemLabel(
        payload.identity.gameSystem,
        payload.identity.customGameSystemName,
      )}`,
      `Themes: ${
        payload.identity.genreThemes.length > 0
          ? payload.identity.genreThemes.map(getCampaignThemeLabel).join(', ')
          : 'None selected'
      }`,
      `Import directories mapped: ${payload.imports.folderMappings.length}`,
      `Campaign source: ${
        payload.imports.campaignSource === 'contentPack' && payload.imports.contentPack
          ? payload.imports.contentPack.packId
          : payload.imports.campaignSource === 'sampleData' &&
              payload.imports.sampleDataProfile
            ? payload.imports.sampleDataProfile.profileId
            : payload.imports.campaignSource
      }`,
      `Calendar integration: ${
        payload.imports.calendarConfigFile ? 'Configuration file attached' : 'Not attached'
      }`,
      `Discoverability: ${
        payload.access.discoverability === CampaignDiscoverability.PUBLIC
          ? 'Public'
          : payload.access.discoverability === CampaignDiscoverability.UNLISTED
            ? 'Unlisted'
            : 'Private'
      }`,
    ],
    [payload],
  );

  if (!open) return null;

  function handleResetAndClose() {
    setPayload(INITIAL_PAYLOAD);
    setStep(0);
    setError(null);
    setTitleTouched(false);
    onClose();
  }

  function resizeDescriptionArea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  }

  function setGenreThemes(genreThemes: string[]) {
    setPayload((current) => ({
      ...current,
      identity: {
        ...current.identity,
        genreThemes,
      },
    }));
  }

  function setCoverImage(file: File | null) {
    setPayload((current) => ({
      ...current,
      identity: {
        ...current.identity,
        coverImage: file,
      },
    }));
  }

  function setMarkdownZip(file: File | null) {
    const scannedFolders = file ? inferFoldersFromZipFilename(file.name) : [];
    const mappings = scannedFolders.map<FolderMapping>((folderName) => {
      const matched = fuzzyMatchTarget(folderName);
      return {
        sourceFolderName: folderName,
        targetModule: matched,
        isAutoMatched: Boolean(matched),
      };
    });

    setPayload((current) => ({
      ...current,
      imports: {
        ...current.imports,
        campaignSource: file ? 'obsidian' : current.imports.campaignSource,
        contentPack: file ? null : current.imports.contentPack,
        sampleDataProfile: file ? null : current.imports.sampleDataProfile,
        importSource: file ? 'obsidian' : 'none',
        markdownZipFile: file,
        backupZipFile: null,
        folderMappings: mappings,
      },
    }));
  }

  function setBackupZip(file: File | null) {
    setPayload((current) => ({
      ...current,
      imports: {
        ...current.imports,
        campaignSource: file ? 'esiana-backup' : current.imports.campaignSource,
        contentPack: file ? null : current.imports.contentPack,
        sampleDataProfile: file ? null : current.imports.sampleDataProfile,
        importSource: file ? 'esiana-backup' : 'none',
        backupZipFile: file,
        markdownZipFile: null,
        folderMappings: [],
      },
    }));
  }

  function setCalendarConfig(file: File | null) {
    setPayload((current) => ({
      ...current,
      imports: {
        ...current.imports,
        calendarConfigFile: file,
      },
    }));
  }

  function updateMappingTarget(index: number, targetModule: FolderMapping['targetModule']) {
    setPayload((current) => {
      const nextMappings = current.imports.folderMappings.map((mapping, idx) => {
        if (idx !== index) return mapping;
        return {
          ...mapping,
          targetModule,
          isAutoMatched: mapping.isAutoMatched && mapping.targetModule === targetModule,
        };
      });
      return {
        ...current,
        imports: {
          ...current.imports,
          folderMappings: nextMappings,
        },
      };
    });
  }

  function onDropSingleFile(
    event: DragEvent<HTMLDivElement>,
    setter: (file: File | null) => void,
    setDragState: (dragState: boolean) => void,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setDragState(false);
    const file = event.dataTransfer.files[0] ?? null;
    setter(file);
  }

  function handleNext() {
    if (step === 0) {
      setTitleTouched(true);
      if (titleMissing) return;
    }
    if (step < STEPS.length - 1) {
      setStep((value) => value + 1);
    }
  }

  function handleBack() {
    setError(null);
    if (step > 0) setStep((value) => value - 1);
  }

  async function handleCreateCampaign() {
    if (step !== STEPS.length - 1) return;
    setTitleTouched(true);
    if (titleMissing) {
      setError('A campaign title is required before creating your campaign.');
      return;
    }
    if (hasUnmappedFolders) {
      setError('Please map all imported folders before creating your campaign.');
      return;
    }
    if (customGameSystemMissing) {
      setError('Enter a custom game system name when selecting Other.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const docs: UserTemplateResourceKind[] = [];
      if (payload.importDefaults.tableExpectations && defaultsAvailable.tableExpectations) {
        docs.push('tableExpectations');
      }
      if (payload.importDefaults.houseRules && defaultsAvailable.houseRules) docs.push('rules');
      if (payload.importDefaults.sessionZero && defaultsAvailable.sessionZero) {
        docs.push('sessionZero');
      }
      if (payload.importDefaults.safetyGuidelines && defaultsAvailable.safetyGuidelines) {
        docs.push('safetyGuidelines');
      }

      const userDefaults =
        docs.length > 0 || payload.importDefaults.recruitmentPreferences
          ? {
              ...(docs.length > 0 ? { docs } : {}),
              ...(payload.importDefaults.recruitmentPreferences
                ? { recruitmentPreferences: true }
                : {}),
            }
          : undefined;

      const bootstrapSelection =
        payload.imports.campaignSource === 'contentPack' && payload.imports.contentPack
          ? {
              kind: 'contentPack' as const,
              pluginId: payload.imports.contentPack.pluginId,
              packId: payload.imports.contentPack.packId,
            }
          : payload.imports.campaignSource === 'sampleData' &&
              payload.imports.sampleDataProfile
            ? {
                kind: 'sampleData' as const,
                profileId: payload.imports.sampleDataProfile.profileId,
                ...(payload.imports.sampleDataSeed.trim()
                  ? { seed: payload.imports.sampleDataSeed.trim() }
                  : {}),
                density: payload.imports.sampleDataDensity,
              }
            : undefined;

      const campaign = await createCampaignWithWizard({
        name: payload.identity.title.trim(),
        description: payload.identity.description.trim() || undefined,
        discoverability: payload.access.discoverability,
        gameSystem: payload.identity.gameSystem,
        customGameSystemName: payload.identity.customGameSystemName ?? undefined,
        importManifest: {
          genreThemes: payload.identity.genreThemes,
          folderMappings: payload.imports.folderMappings,
          ...(userDefaults ? { userDefaults } : {}),
          ...(bootstrapSelection ? { bootstrap: bootstrapSelection } : {}),
        },
        coverImage: payload.identity.coverImage ?? undefined,
        markdownZipFile: payload.imports.markdownZipFile ?? undefined,
        backupZipFile: payload.imports.backupZipFile ?? undefined,
        calendarConfigFile: payload.imports.calendarConfigFile ?? undefined,
      });
      onCreated(campaign);
      handleResetAndClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to create campaign',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-campaign-wizard-title"
    >
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2
              id="new-campaign-wizard-title"
              className="flex items-center gap-2 text-xl font-semibold text-foreground"
            >
              <Plus className="size-5 text-primary" />
              New Campaign Wizard
            </h2>
            <p className="mt-1 text-sm text-muted">
              Build a campaign foundation, import your lore, and launch access controls.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-elevated hover:text-foreground"
            aria-label="Close new campaign wizard"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="border-b border-border px-6 py-4">
          <ol className="grid gap-2 md:grid-cols-3">
            {STEPS.map((label, index) => {
              const active = index === step;
              const done = index < step;
              return (
                <li
                  key={label}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    active
                      ? 'border-primary/60 bg-primary/10 text-primary'
                      : done
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                        : 'border-border text-muted'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (index <= step) {
                        setStep(index);
                        setError(null);
                      }
                    }}
                    disabled={index > step}
                    className="inline-flex w-full items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {done ? <CheckCircle2 className="size-4" /> : <ChevronRight className="size-4" />}
                    Step {index + 1}: {label}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="max-h-[64vh] overflow-y-auto px-6 py-5">
          {error && (
            <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          {step === 0 && (
            <section className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-foreground">
                      Campaign Title <span className="text-primary">*</span>
                    </span>
                    <input
                      value={payload.identity.title}
                      onBlur={() => setTitleTouched(true)}
                      onChange={(event) => {
                        setPayload((current) => ({
                          ...current,
                          identity: { ...current.identity, title: event.target.value },
                        }));
                      }}
                      placeholder="Shards of the Astral Crown"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-primary/60"
                      required
                    />
                    {titleTouched && titleMissing && (
                      <span className="text-xs text-red-300">
                        A campaign title is required to continue.
                      </span>
                    )}
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-foreground">
                      Description / Blurb
                    </span>
                    <textarea
                      ref={textareaRef}
                      rows={3}
                      value={payload.identity.description}
                      onInput={resizeDescriptionArea}
                      onChange={(event) =>
                        setPayload((current) => ({
                          ...current,
                          identity: {
                            ...current.identity,
                            description: event.target.value,
                          },
                        }))
                      }
                      placeholder="A relic-hunt campaign spanning haunted jungles and shattered floating citadels."
                      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-primary/60"
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium text-foreground">Game System</span>
                    <GameSystemSelect
                      gameSystem={payload.identity.gameSystem}
                      customGameSystemName={payload.identity.customGameSystemName}
                      onGameSystemChange={(slug) =>
                        setPayload((current) => ({
                          ...current,
                          identity: {
                            ...current.identity,
                            gameSystem: slug ?? 'dnd-5e',
                            customGameSystemName:
                              slug === 'other' ? current.identity.customGameSystemName : null,
                          },
                        }))
                      }
                      onCustomNameChange={(name) =>
                        setPayload((current) => ({
                          ...current,
                          identity: {
                            ...current.identity,
                            customGameSystemName: name,
                          },
                        }))
                      }
                      selectClassName="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-primary/60"
                      inputClassName="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none transition-colors focus:border-primary/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-sm font-medium text-foreground">
                      Cover Banner (Optional)
                    </span>
                    <div
                      onDragOver={(event) => {
                        event.preventDefault();
                        setCoverDragOver(true);
                      }}
                      onDragLeave={() => setCoverDragOver(false)}
                      onDrop={(event) =>
                        onDropSingleFile(event, setCoverImage, setCoverDragOver)
                      }
                      className={`rounded-lg border border-dashed p-5 text-center transition-colors ${
                        coverDragOver
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background/70'
                      }`}
                    >
                      <Upload className="mx-auto mb-2 size-5 text-muted" />
                      <p className="text-sm text-foreground">
                        Drag and drop an image, or{' '}
                        <button
                          type="button"
                          onClick={() => coverInputRef.current?.click()}
                          className="text-primary underline underline-offset-2"
                        >
                          browse
                        </button>
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        PNG, JPG, WEBP accepted. Recommended wide aspect ratio.
                      </p>
                      {payload.identity.coverImage && (
                        <p className="mt-2 text-xs text-emerald-300">
                          Selected: {payload.identity.coverImage.name}
                        </p>
                      )}
                    </div>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => setCoverImage(event.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Genre themes</p>
                <p className="text-xs text-muted">
                  Optional tags for discovery and recruitment. You can refine these later in
                  Recruitment settings.
                </p>
                <CampaignThemeMultiSelect
                  values={payload.identity.genreThemes}
                  onChange={setGenreThemes}
                />
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-6">
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Campaign source</h3>
                  <p className="mt-1 text-xs text-muted">
                    Start blank, import a content pack from an installed plugin, or use developer
                    sample data fixtures.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPayload((current) => ({
                        ...current,
                        imports: {
                          ...current.imports,
                          campaignSource: 'blank',
                          contentPack: null,
                          sampleDataProfile: null,
                          importSource: 'none',
                          markdownZipFile: null,
                          backupZipFile: null,
                          folderMappings: [],
                        },
                      }))
                    }
                    className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${
                      payload.imports.campaignSource === 'blank'
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border bg-background/40 hover:border-primary/40 hover:bg-elevated/50'
                    }`}
                    aria-pressed={payload.imports.campaignSource === 'blank'}
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="size-5 shrink-0 text-primary" />
                      <p className="text-sm font-medium text-foreground">Blank Campaign</p>
                    </div>
                    <p className="text-xs text-muted">
                      Default wiki skeleton only — populate content yourself.
                    </p>
                  </button>
                </div>

                {contentPackCards.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Content Packs
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {contentPackCards.map((card) => {
                        const isSelected =
                          payload.imports.campaignSource === 'contentPack' &&
                          payload.imports.contentPack?.packId === card.packId &&
                          payload.imports.contentPack?.pluginId === card.pluginId;
                        const subtitle = [
                          getCampaignFormatLabel(card.campaignFormat),
                          card.gameSystem
                            ? getGameSystemLabel(card.gameSystem)
                            : 'System neutral',
                          ...(card.genreThemes?.map(getCampaignThemeLabel) ?? []),
                        ].join(' · ');
                        return (
                          <button
                            key={`${card.pluginId}:${card.packId}`}
                            type="button"
                            onClick={() =>
                              setPayload((current) => ({
                                ...current,
                                identity: {
                                  ...current.identity,
                                  ...(card.gameSystem ? { gameSystem: card.gameSystem } : {}),
                                  ...(card.genreThemes?.length
                                    ? { genreThemes: card.genreThemes }
                                    : {}),
                                },
                                imports: {
                                  ...current.imports,
                                  campaignSource: 'contentPack',
                                  importSource: 'none',
                                  markdownZipFile: null,
                                  backupZipFile: null,
                                  folderMappings: [],
                                  contentPack: {
                                    pluginId: card.pluginId,
                                    packId: card.packId,
                                  },
                                  sampleDataProfile: null,
                                },
                              }))
                            }
                            className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${
                              isSelected
                                ? 'border-primary/60 bg-primary/10'
                                : 'border-border bg-background/40 hover:border-primary/40 hover:bg-elevated/50'
                            }`}
                            aria-pressed={isSelected}
                          >
                            <div className="flex items-center gap-2">
                              <BookOpen className="size-5 shrink-0 text-primary" />
                              <p className="text-sm font-medium text-foreground">{card.name}</p>
                            </div>
                            {card.author && (
                              <p className="text-xs text-muted">
                                by{' '}
                                {card.authorUrl ? (
                                  <a
                                    href={card.authorUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    {card.author}
                                  </a>
                                ) : (
                                  card.author
                                )}
                              </p>
                            )}
                            <p className="text-xs text-muted">{subtitle}</p>
                            <p className="text-xs text-muted">{card.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sampleDataProfiles.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-dashed border-border/80 bg-background/30 p-4">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Sample Data
                      </h4>
                      <span className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                        Dev
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      Deterministic test fixtures for QA and development — not authored adventures.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {sampleDataProfiles.map((profile) => {
                        const isSelected =
                          payload.imports.campaignSource === 'sampleData' &&
                          payload.imports.sampleDataProfile?.profileId === profile.profileId;
                        return (
                          <button
                            key={profile.profileId}
                            type="button"
                            onClick={() =>
                              setPayload((current) => ({
                                ...current,
                                imports: {
                                  ...current.imports,
                                  campaignSource: 'sampleData',
                                  importSource: 'none',
                                  markdownZipFile: null,
                                  backupZipFile: null,
                                  folderMappings: [],
                                  contentPack: null,
                                  sampleDataProfile: { profileId: profile.profileId },
                                  sampleDataSeed:
                                    current.imports.sampleDataSeed || profile.defaultSeed,
                                  sampleDataDensity: profile.defaultDensity,
                                },
                              }))
                            }
                            className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${
                              isSelected
                                ? 'border-primary/60 bg-primary/10'
                                : 'border-border bg-background/40 hover:border-primary/40 hover:bg-elevated/50'
                            }`}
                            aria-pressed={isSelected}
                          >
                            <p className="text-sm font-medium text-foreground">{profile.label}</p>
                            <p className="text-xs text-muted">{profile.description}</p>
                          </button>
                        );
                      })}
                    </div>

                    {payload.imports.campaignSource === 'sampleData' &&
                      payload.imports.sampleDataProfile && (
                        <div className="space-y-3 pt-2">
                          <div className="space-y-1.5">
                            <label
                              className="text-xs font-medium text-muted"
                              htmlFor="sample-data-seed"
                            >
                              Seed string (optional)
                            </label>
                            <input
                              id="sample-data-seed"
                              type="text"
                              value={payload.imports.sampleDataSeed}
                              onChange={(event) =>
                                setPayload((current) => ({
                                  ...current,
                                  imports: {
                                    ...current.imports,
                                    sampleDataSeed: event.target.value,
                                  },
                                }))
                              }
                              placeholder="Leave blank for profile default"
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label
                              className="text-xs font-medium text-muted"
                              htmlFor="sample-data-density"
                            >
                              Activity density
                            </label>
                            <select
                              id="sample-data-density"
                              value={payload.imports.sampleDataDensity}
                              onChange={(event) =>
                                setPayload((current) => ({
                                  ...current,
                                  imports: {
                                    ...current.imports,
                                    sampleDataDensity: event.target.value as
                                      | 'quiet'
                                      | 'active'
                                      | 'obsessive',
                                  },
                                }))
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60"
                            >
                              <option value="quiet">Quiet</option>
                              <option value="active">Active</option>
                              <option value="obsessive">Obsessive</option>
                            </select>
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-background/50 p-4">
                <a
                  href={docsLinks.importFormats}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary"
                >
                  📄 View template format guide to optimize your markdown import structure
                </a>
                <p className="mt-2 text-xs text-muted">
                  For best results, name your export folders to match our core modules:
                  folders like &apos;Characters&apos; or &apos;NPCs&apos; map to Characters,
                  &apos;Monsters&apos; or &apos;Creatures&apos; map to your Bestiary, and
                  &apos;Session Notes&apos; or &apos;Logs&apos; go straight to Session Notes.
                </p>
              </div>

              {pluginImportProviders.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Plugin import providers</h3>
                    <p className="mt-1 text-xs text-muted">
                      Installed plugins can register additional import flows. Enable the plugin in
                      Campaign Settings after creation to run these imports.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {pluginImportProviders.map((provider) => (
                      <div
                        key={provider.id}
                        className="flex flex-col gap-2 rounded-xl border border-border bg-background/40 p-4"
                      >
                        <p className="text-sm font-medium text-foreground">{provider.label}</p>
                        {provider.description && (
                          <p className="text-xs text-muted">{provider.description}</p>
                        )}
                        <p className="text-[10px] uppercase tracking-wide text-muted">
                          {provider.pluginId}
                          {provider.requiresFile ? ' · file required' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Wiki import</h3>
                  <p className="mt-1 text-xs text-muted">
                    Import pages, folders, and wiki structure from another tool or a
                    previous Esiana export.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {WIKI_IMPORT_SOURCES.map((source) => {
                    const SourceIcon = source.Icon;
                    const isObsidian = source.id === 'obsidian';
                    const isEsianaBackup = source.id === 'esiana-backup';
                    const hasObsidianZip = Boolean(payload.imports.markdownZipFile);
                    const hasBackupZip = Boolean(payload.imports.backupZipFile);
                    const isSelected =
                      (isObsidian && hasObsidianZip) ||
                      (isEsianaBackup && hasBackupZip);

                    if (source.planned) {
                      return (
                        <div
                          key={source.id}
                          aria-disabled="true"
                          className="flex flex-col gap-2 rounded-xl border border-border bg-background/30 p-4 opacity-60"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <SourceIcon className="size-5 shrink-0 text-muted" />
                              <p className="text-sm font-medium text-foreground">
                                {source.label}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                              Planned
                            </span>
                          </div>
                          <p className="text-xs text-muted">{source.description}</p>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => {
                          if (isEsianaBackup) {
                            backupZipInputRef.current?.click();
                            setPayload((current) => ({
                              ...current,
                              imports: {
                                ...current.imports,
                                campaignSource: 'esiana-backup',
                                contentPack: null,
                                sampleDataProfile: null,
                                importSource: 'esiana-backup',
                                markdownZipFile: null,
                                folderMappings: [],
                              },
                            }));
                          } else {
                            markdownZipInputRef.current?.click();
                            setPayload((current) => ({
                              ...current,
                              imports: {
                                ...current.imports,
                                campaignSource: 'obsidian',
                                contentPack: null,
                                sampleDataProfile: null,
                                importSource: 'obsidian',
                                backupZipFile: null,
                              },
                            }));
                          }
                        }}
                        className={`flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors ${
                          isSelected
                            ? 'border-primary/60 bg-primary/10'
                            : 'border-border bg-background/40 hover:border-primary/40 hover:bg-elevated/50'
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center gap-2">
                          <SourceIcon className="size-5 shrink-0 text-primary" />
                          <p className="text-sm font-medium text-foreground">
                            {source.label}
                          </p>
                        </div>
                        <p className="text-xs text-muted">{source.description}</p>
                        <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs text-foreground">
                          <FileArchive className="size-3.5" />
                          Choose .zip file
                        </span>
                        {isObsidian && hasObsidianZip && (
                          <p className="text-xs text-emerald-300">
                            Selected: {payload.imports.markdownZipFile?.name}
                          </p>
                        )}
                        {isEsianaBackup && hasBackupZip && (
                          <p className="text-xs text-emerald-300">
                            Selected: {payload.imports.backupZipFile?.name}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                <input
                  ref={markdownZipInputRef}
                  type="file"
                  accept=".zip,application/zip"
                  className="hidden"
                  onChange={(event) => setMarkdownZip(event.target.files?.[0] ?? null)}
                />
                <input
                  ref={backupZipInputRef}
                  type="file"
                  accept=".zip,application/zip"
                  className="hidden"
                  onChange={(event) => setBackupZip(event.target.files?.[0] ?? null)}
                />

                {payload.imports.importSource === 'obsidian' &&
                  payload.imports.folderMappings.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="border-b border-border bg-surface/90 px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <FolderTree className="size-4 text-primary" />
                      Source Folder Mapping
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Auto-matches are pre-selected. Review each folder before proceeding.
                    </p>
                  </div>
                  <div className="overflow-x-auto bg-background/60">
                    <table className="min-w-full divide-y divide-border text-sm">
                      <thead className="bg-surface/80 text-left text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-4 py-3">Source Folder Name</th>
                          <th className="px-4 py-3">Target Module</th>
                          <th className="px-4 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-foreground">
                        {payload.imports.folderMappings.map((mapping, index) => (
                          <tr key={`${mapping.sourceFolderName}-${index}`}>
                            <td className="px-4 py-3">{mapping.sourceFolderName}</td>
                            <td className="px-4 py-3">
                              <select
                                value={mapping.targetModule}
                                onChange={(event) =>
                                  updateMappingTarget(
                                    index,
                                    event.target.value as FolderMapping['targetModule'],
                                  )
                                }
                                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary/60"
                              >
                                <option value="">Select destination…</option>
                                {MODULE_TARGETS.map((target) => (
                                  <option key={target} value={target}>
                                    {target}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              {mapping.isAutoMatched && mapping.targetModule ? (
                                <span className="inline-flex rounded-full border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200">
                                  Auto-Matched
                                </span>
                              ) : mapping.targetModule ? (
                                <span className="inline-flex rounded-full border border-border bg-elevated px-2 py-1 text-xs text-foreground">
                                  Manually Mapped
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-200">
                                  Mapping Required
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                )}
              </div>

              <div className="space-y-4 border-t border-border pt-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Timelines</h3>
                  <p className="mt-1 text-xs text-muted">
                    Import calendar and timeline configuration.
                  </p>
                </div>
                <FantasyCalendarImportZone
                  mode="preview"
                  selectedFile={payload.imports.calendarConfigFile}
                  onFileSelected={setCalendarConfig}
                  className="text-left"
                />
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() =>
                    setPayload((current) => ({
                      ...current,
                      access: { discoverability: CampaignDiscoverability.PRIVATE },
                    }))
                  }
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    payload.access.discoverability === CampaignDiscoverability.PRIVATE
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-border bg-background/50 hover:border-border'
                  }`}
                  aria-pressed={
                    payload.access.discoverability === CampaignDiscoverability.PRIVATE
                  }
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Lock className="size-4 text-primary" />
                    Private
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Only you and explicitly invited players can view this world.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPayload((current) => ({
                      ...current,
                      access: { discoverability: CampaignDiscoverability.UNLISTED },
                    }))
                  }
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    payload.access.discoverability === CampaignDiscoverability.UNLISTED
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-border bg-background/50 hover:border-border'
                  }`}
                  aria-pressed={
                    payload.access.discoverability === CampaignDiscoverability.UNLISTED
                  }
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Link2 className="size-4 text-primary" />
                    Unlisted
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Anyone with the campaign link can browse the anonymous codex. Not listed on
                    the Global Hub.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPayload((current) => ({
                      ...current,
                      access: { discoverability: CampaignDiscoverability.PUBLIC },
                    }))
                  }
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    payload.access.discoverability === CampaignDiscoverability.PUBLIC
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-border bg-background/50 hover:border-border'
                  }`}
                  aria-pressed={
                    payload.access.discoverability === CampaignDiscoverability.PUBLIC
                  }
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Globe className="size-4 text-primary" />
                    Public
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    Listed on the Global Hub. Guests can browse the anonymous codex.
                  </p>
                </button>
              </div>

              {(defaultsAvailable.tableExpectations ||
                defaultsAvailable.houseRules ||
                defaultsAvailable.sessionZero ||
                defaultsAvailable.safetyGuidelines ||
                defaultsAvailable.recruitmentPreferences) && (
                <div className="rounded-xl border border-border bg-background/50 p-4">
                  <p className="text-sm font-semibold text-foreground">Import Defaults</p>
                  <p className="mt-1 text-xs text-muted">
                    Copy saved templates and recruitment preferences from Campaign Defaults.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {defaultsAvailable.tableExpectations ? (
                      <li>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={payload.importDefaults.tableExpectations}
                            onChange={(e) =>
                              setPayload((current) => ({
                                ...current,
                                importDefaults: {
                                  ...current.importDefaults,
                                  tableExpectations: e.target.checked,
                                },
                              }))
                            }
                            className="size-4 rounded border-border"
                          />
                          Table Expectations
                        </label>
                      </li>
                    ) : null}
                    {defaultsAvailable.safetyGuidelines ? (
                      <li>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={payload.importDefaults.safetyGuidelines}
                            onChange={(e) =>
                              setPayload((current) => ({
                                ...current,
                                importDefaults: {
                                  ...current.importDefaults,
                                  safetyGuidelines: e.target.checked,
                                },
                              }))
                            }
                            className="size-4 rounded border-border"
                          />
                          Safety Guidelines
                        </label>
                      </li>
                    ) : null}
                    {defaultsAvailable.sessionZero ? (
                      <li>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={payload.importDefaults.sessionZero}
                            onChange={(e) =>
                              setPayload((current) => ({
                                ...current,
                                importDefaults: {
                                  ...current.importDefaults,
                                  sessionZero: e.target.checked,
                                },
                              }))
                            }
                            className="size-4 rounded border-border"
                          />
                          Session Zero
                        </label>
                      </li>
                    ) : null}
                    {defaultsAvailable.houseRules ? (
                      <li>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={payload.importDefaults.houseRules}
                            onChange={(e) =>
                              setPayload((current) => ({
                                ...current,
                                importDefaults: {
                                  ...current.importDefaults,
                                  houseRules: e.target.checked,
                                },
                              }))
                            }
                            className="size-4 rounded border-border"
                          />
                          House Rules
                        </label>
                      </li>
                    ) : null}
                    {defaultsAvailable.recruitmentPreferences ? (
                      <li>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
                          <input
                            type="checkbox"
                            checked={payload.importDefaults.recruitmentPreferences}
                            onChange={(e) =>
                              setPayload((current) => ({
                                ...current,
                                importDefaults: {
                                  ...current.importDefaults,
                                  recruitmentPreferences: e.target.checked,
                                },
                              }))
                            }
                            className="size-4 rounded border-border"
                          />
                          Recruitment Preferences
                        </label>
                      </li>
                    ) : null}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-border bg-background/50 p-4">
                <p className="text-sm font-semibold text-foreground">Creation Review</p>
                <ul className="mt-3 space-y-2 text-sm text-foreground">
                  {summaryItems.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                {hasUnmappedFolders && (
                  <p className="mt-3 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                    Some imported folders are still unmapped. Return to the import step and
                    assign every folder to continue.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={step === 0 ? handleResetAndClose : handleBack}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-elevated"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          <button
            type="button"
            onClick={
              step === STEPS.length - 1
                ? () => {
                    void handleCreateCampaign();
                  }
                : handleNext
            }
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {step === STEPS.length - 1
              ? submitting
                ? 'Creating…'
                : 'Confirm & Create Campaign'
              : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
