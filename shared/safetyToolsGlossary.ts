export type SafetyToolGlossaryEntry = {
  slug: string;
  label: string;
  aliases: string[];
  description: string;
};

export const SAFETY_TOOLS_GLOSSARY: SafetyToolGlossaryEntry[] = [
  {
    slug: 'x-card',
    label: 'X-Card',
    aliases: ['x card', 'xcard'],
    description:
      'A safety tool allowing players to pause or redirect uncomfortable content during play without explanation.',
  },
  {
    slug: 'lines-and-veils',
    label: 'Lines & Veils',
    aliases: ['lines and veils', 'lines & veils', 'lines veils'],
    description:
      'Lines are topics that will not appear in play; veils are topics that may exist off-screen but are not played out in detail.',
  },
  {
    slug: 'open-door',
    label: 'Open Door',
    aliases: ['open door policy', 'open-door'],
    description:
      'Players may leave the session or take a break at any time without needing to justify it to the group.',
  },
  {
    slug: 'session-zero',
    label: 'Session Zero',
    aliases: ['session 0', 'session0'],
    description:
      'A dedicated setup session to align on tone, boundaries, expectations, and character concepts before play begins.',
  },
  {
    slug: 'consent-checklist',
    label: 'Consent Checklist',
    aliases: ['consent checklist', 'consent form'],
    description:
      'A structured list of themes and intensities players mark as okay, unsure, or off-limits for the campaign.',
  },
  {
    slug: 'script-change',
    label: 'Script Change',
    aliases: ['script change', 'script-change'],
    description:
      'A hand signal or phrase to rewind or revise a scene that has become uncomfortable without blame.',
  },
  {
    slug: 'pause-for-a-breath',
    label: 'Pause for a Breath',
    aliases: ['pause for breath', 'take a breath'],
    description:
      'A brief pause to decompress when content feels intense, without stopping the whole session.',
  },
];

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase().replace(/[-_]+/g, ' ');
}

export function findSafetyToolByTerm(term: string): SafetyToolGlossaryEntry | null {
  const normalized = normalizeTerm(term);
  if (!normalized) return null;
  for (const entry of SAFETY_TOOLS_GLOSSARY) {
    if (normalizeTerm(entry.label) === normalized) return entry;
    if (entry.aliases.some((alias) => normalizeTerm(alias) === normalized)) return entry;
  }
  return null;
}

/** Split freeform safety tools text into glossary hits and remaining prose segments. */
export function tokenizeSafetyToolsText(text: string): Array<
  | { type: 'term'; entry: SafetyToolGlossaryEntry; raw: string }
  | { type: 'text'; value: string }
> {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const segments: Array<
    | { type: 'term'; entry: SafetyToolGlossaryEntry; raw: string }
    | { type: 'text'; value: string }
  > = [];

  const candidates = [
    ...SAFETY_TOOLS_GLOSSARY.flatMap((entry) => [entry.label, ...entry.aliases]),
  ].sort((a, b) => b.length - a.length);

  let remaining = trimmed;
  while (remaining.length > 0) {
    let matched = false;
    for (const candidate of candidates) {
      const pattern = new RegExp(
        `(^|[,;•\\n]|\\s)(${candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=[,;•\\n]|\\s|$)`,
        'i',
      );
      const match = remaining.match(pattern);
      if (!match || match.index === undefined) continue;
      const raw = match[2] ?? '';
      const entry = findSafetyToolByTerm(raw);
      if (!entry) continue;
      const start = match.index + (match[1]?.length ?? 0);
      if (start > 0) {
        segments.push({ type: 'text', value: remaining.slice(0, start) });
      }
      segments.push({ type: 'term', entry, raw });
      remaining = remaining.slice(start + raw.length);
      matched = true;
      break;
    }
    if (!matched) {
      segments.push({ type: 'text', value: remaining });
      break;
    }
  }

  return segments.filter(
    (segment) => segment.type !== 'text' || segment.value.trim().length > 0,
  );
}
