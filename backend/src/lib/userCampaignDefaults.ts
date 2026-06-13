export const TABLE_DEFAULT_KEYS = [
  'beginnerFriendly',
  'inclusiveTable',
  'roleplayFocused',
  'rulesLight',
  'rulesHeavy',
  'voiceRequired',
  'cameraOptional',
  'accessibilityConscious',
] as const;

export type TableDefaultKey = (typeof TABLE_DEFAULT_KEYS)[number];

export const TABLE_DEFAULT_LABELS: Record<TableDefaultKey, string> = {
  beginnerFriendly: 'Beginner Friendly',
  inclusiveTable: 'Inclusive Table',
  roleplayFocused: 'Roleplay Focused',
  rulesLight: 'Rules Light',
  rulesHeavy: 'Rules Heavy',
  voiceRequired: 'Voice Required',
  cameraOptional: 'Camera Optional',
  accessibilityConscious: 'Accessibility-Conscious',
};

export const SAFETY_DEFAULT_KEYS = [
  'sessionZero',
  'xCard',
  'linesAndVeils',
  'openDoorPolicy',
  'aftercareDebrief',
] as const;

export type SafetyDefaultKey = (typeof SAFETY_DEFAULT_KEYS)[number];

export const SAFETY_DEFAULT_LABELS: Record<SafetyDefaultKey, string> = {
  sessionZero: 'Session Zero',
  xCard: 'X-Card',
  linesAndVeils: 'Lines & Veils',
  openDoorPolicy: 'Open Door Policy',
  aftercareDebrief: 'Aftercare / Debrief',
};

/** Maps safety toggle keys to lines appended to campaign safetyTools on import. */
export const SAFETY_DEFAULT_SAFETY_LINES: Record<SafetyDefaultKey, string> = {
  sessionZero: 'Session Zero',
  xCard: 'X-Card',
  linesAndVeils: 'Lines & Veils',
  openDoorPolicy: 'Open Door Policy',
  aftercareDebrief: 'Aftercare / Debrief',
};

export const USER_TEMPLATE_RESOURCE_KINDS = [
  'tableExpectations',
  'rules',
  'sessionZero',
  'safetyGuidelines',
  'faq',
  'characterCreation',
  'homebrew',
] as const;

export type UserTemplateResourceKind = (typeof USER_TEMPLATE_RESOURCE_KINDS)[number];

export type UserTemplateResourceMeta = {
  label: string;
  editorTitle: string;
  canonicalWikiTitle: string;
  includeCampaignField:
    | 'includeTableExpectations'
    | 'includeRules'
    | 'includeSessionZero'
    | 'includeSafetyGuidelines'
    | 'includeFAQ'
    | 'includeCharacterCreation'
    | 'includeHomebrew';
  routeSlug: string;
};

export const USER_TEMPLATE_RESOURCE_META: Record<
  UserTemplateResourceKind,
  UserTemplateResourceMeta
> = {
  tableExpectations: {
    label: 'Table Expectations',
    editorTitle: 'Table Expectations Template',
    canonicalWikiTitle: 'Table Expectations',
    includeCampaignField: 'includeTableExpectations',
    routeSlug: 'table-expectations',
  },
  rules: {
    label: 'House Rules',
    editorTitle: 'House Rules Template',
    canonicalWikiTitle: 'Rules',
    includeCampaignField: 'includeRules',
    routeSlug: 'house-rules',
  },
  sessionZero: {
    label: 'Session Zero Template',
    editorTitle: 'Session Zero Template',
    canonicalWikiTitle: 'Session Zero',
    includeCampaignField: 'includeSessionZero',
    routeSlug: 'session-zero',
  },
  safetyGuidelines: {
    label: 'Safety Guidelines',
    editorTitle: 'Safety Guidelines Template',
    canonicalWikiTitle: 'Safety Guidelines',
    includeCampaignField: 'includeSafetyGuidelines',
    routeSlug: 'safety-guidelines',
  },
  faq: {
    label: 'FAQ Template',
    editorTitle: 'FAQ Template',
    canonicalWikiTitle: 'FAQ',
    includeCampaignField: 'includeFAQ',
    routeSlug: 'faq',
  },
  characterCreation: {
    label: 'Character Creation Guide',
    editorTitle: 'Character Creation Guide Template',
    canonicalWikiTitle: 'Character Creation Guide',
    includeCampaignField: 'includeCharacterCreation',
    routeSlug: 'character-creation',
  },
  homebrew: {
    label: 'Homebrew Content',
    editorTitle: 'Homebrew Template',
    canonicalWikiTitle: 'Homebrew',
    includeCampaignField: 'includeHomebrew',
    routeSlug: 'homebrew',
  },
};

export const USER_TEMPLATE_ROUTE_SLUGS = Object.fromEntries(
  Object.entries(USER_TEMPLATE_RESOURCE_META).map(([kind, meta]) => [
    meta.routeSlug,
    kind as UserTemplateResourceKind,
  ]),
) as Record<string, UserTemplateResourceKind>;

export type BooleanToggleMap = Record<string, boolean>;

export type UserCampaignDefaultsRecruitmentPrefs = {
  genreThemes?: string[];
  safetyToolsText?: string | null;
  externalTools?: string[];
  contentWarnings?: string | null;
  equipmentNeeded?: string | null;
};

export type UserCampaignDefaultsPrefs = {
  tableDefaults?: Partial<Record<TableDefaultKey, boolean>>;
  safetyDefaults?: Partial<Record<SafetyDefaultKey, boolean>>;
  recruitmentPrefs?: UserCampaignDefaultsRecruitmentPrefs;
};

export type UserDefaultsImportSelection = {
  docs?: UserTemplateResourceKind[];
  recruitmentPreferences?: boolean;
};

export const USER_TEMPLATE_STARTER_MARKDOWN: Partial<
  Record<UserTemplateResourceKind, string>
> = {
  tableExpectations: `# Table Expectations

How we play together week to week—social culture, not house rules or safety policy.

## Attendance & communication

- How committed is the table (casual vs regular)?
- Lateness, cancellations, and quorum expectations:

## Voice & video

- Cameras, push-to-talk, quiet environment:

## Tone & play style

- Serious vs casual, in-character focus, humor:

## PvP & table conflict

- Player conflict at the table (allowed, discouraged, opt-in):

## Characters & new players

- Build expectations, teaching pace, homework:
`,
  rules: `# Rules & Expectations

Describe table etiquette, attendance, communication, and how you handle rules disputes.

## Session cadence

- Frequency:
- Start / end times:
- Absences & cancellations:
`,
  sessionZero: `# Session Zero

Use this space to outline how you run Session Zero and what you cover with new players.

## Topics to cover

- Safety tools in use
- Lines & veils
- Campaign tone and themes
- Character creation boundaries
`,
  safetyGuidelines: `# Safety Guidelines

Document the safety tools you use and how players can invoke them.

## Tools we use

- X-Card
- Lines & Veils
- Open Door Policy

## Check-ins

Describe how you handle mid-session pauses and post-session debriefs.
`,
  faq: `# FAQ

Answer common questions applicants might have before joining your table.
`,
  characterCreation: `# Character Creation Guide

Explain how players should build characters for your games.
`,
  homebrew: `# Homebrew Content

Describe any homebrew rules, items, or setting elements players should know about.
`,
};

export function isUserTemplateResourceKind(value: string): value is UserTemplateResourceKind {
  return (USER_TEMPLATE_RESOURCE_KINDS as readonly string[]).includes(value);
}

export function resolveTemplateKindFromRouteSlug(
  routeSlug: string,
): UserTemplateResourceKind | null {
  return USER_TEMPLATE_ROUTE_SLUGS[routeSlug] ?? null;
}

function sanitizeBooleanMap(
  input: unknown,
  allowedKeys: readonly string[],
): BooleanToggleMap {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const source = input as Record<string, unknown>;
  const result: BooleanToggleMap = {};
  for (const key of allowedKeys) {
    if (typeof source[key] === 'boolean') {
      result[key] = source[key];
    }
  }
  return result;
}

export function sanitizeUserCampaignDefaultsPrefs(input: unknown): UserCampaignDefaultsPrefs {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const root = input as Record<string, unknown>;
  const recruitmentRaw =
    root.recruitmentPrefs && typeof root.recruitmentPrefs === 'object'
      ? (root.recruitmentPrefs as Record<string, unknown>)
      : null;

  const recruitmentPrefs: UserCampaignDefaultsRecruitmentPrefs | undefined = recruitmentRaw
    ? {
        ...(Array.isArray(recruitmentRaw.genreThemes)
          ? {
              genreThemes: recruitmentRaw.genreThemes
                .filter((entry): entry is string => typeof entry === 'string')
                .map((entry) => entry.trim())
                .filter(Boolean)
                .slice(0, 24),
            }
          : {}),
        ...(typeof recruitmentRaw.safetyToolsText === 'string'
          ? { safetyToolsText: recruitmentRaw.safetyToolsText.trim() || null }
          : {}),
        ...(Array.isArray(recruitmentRaw.externalTools)
          ? {
              externalTools: recruitmentRaw.externalTools
                .filter((entry): entry is string => typeof entry === 'string')
                .map((entry) => entry.trim())
                .filter(Boolean)
                .slice(0, 24),
            }
          : {}),
        ...(typeof recruitmentRaw.contentWarnings === 'string'
          ? { contentWarnings: recruitmentRaw.contentWarnings.trim() || null }
          : {}),
        ...(typeof recruitmentRaw.equipmentNeeded === 'string'
          ? { equipmentNeeded: recruitmentRaw.equipmentNeeded.trim() || null }
          : {}),
      }
    : undefined;

  return {
    tableDefaults: sanitizeBooleanMap(root.tableDefaults, TABLE_DEFAULT_KEYS) as Partial<
      Record<TableDefaultKey, boolean>
    >,
    safetyDefaults: sanitizeBooleanMap(root.safetyDefaults, SAFETY_DEFAULT_KEYS) as Partial<
      Record<SafetyDefaultKey, boolean>
    >,
    ...(recruitmentPrefs && Object.keys(recruitmentPrefs).length > 0
      ? { recruitmentPrefs }
      : {}),
  };
}

export function buildSafetyToolsFromDefaults(
  prefs: UserCampaignDefaultsPrefs,
): string | null {
  const lines: string[] = [];
  const toggles = prefs.safetyDefaults ?? {};
  for (const key of SAFETY_DEFAULT_KEYS) {
    if (toggles[key]) {
      lines.push(SAFETY_DEFAULT_SAFETY_LINES[key]);
    }
  }
  const extra = prefs.recruitmentPrefs?.safetyToolsText?.trim();
  if (extra) lines.push(extra);
  if (lines.length === 0) return null;
  return lines.join('\n');
}

export function sanitizeUserDefaultsImportSelection(
  input: unknown,
): UserDefaultsImportSelection {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const root = input as Record<string, unknown>;
  const docs = Array.isArray(root.docs)
    ? root.docs.filter(
        (entry): entry is UserTemplateResourceKind =>
          typeof entry === 'string' && isUserTemplateResourceKind(entry),
      )
    : undefined;
  return {
    ...(docs && docs.length > 0 ? { docs } : {}),
    ...(typeof root.recruitmentPreferences === 'boolean'
      ? { recruitmentPreferences: root.recruitmentPreferences }
      : {}),
  };
}
