const CODEX_UNLINKED_MESSAGES: Record<string, string> = {
  CHARACTER: 'This character is not linked elsewhere in the codex yet.',
  QUEST: 'This quest is not linked elsewhere in the codex yet.',
  LOCATION: 'This location is not linked elsewhere in the codex yet.',
  ORGANIZATION: 'This organization is not linked elsewhere in the codex yet.',
  BESTIARY: 'This creature is not linked elsewhere in the codex yet.',
  OBJECT: 'This object is not linked elsewhere in the codex yet.',
  FAMILY: 'This family is not linked elsewhere in the codex yet.',
  ANCESTRY: 'This ancestry is not linked elsewhere in the codex yet.',
  LANGUAGE: 'This language is not linked elsewhere in the codex yet.',
  RULE_RESOURCE: 'This resource is not linked elsewhere in the codex yet.',
};

export function unlinkedEntityMessage(codexType: string, title?: string): string {
  const specific = CODEX_UNLINKED_MESSAGES[codexType];
  if (specific) return specific;
  if (title?.trim()) {
    return `"${title.trim()}" is not connected to the codex yet.`;
  }
  return 'Not connected to the codex yet.';
}

export function brokenLinkMessage(label: string): string {
  const text = label.trim() || 'unknown';
  return text.startsWith('[[')
    ? `Broken link: ${text}`
    : `Broken link: [[${text}]]`;
}

export function unresolvedWikilinkMessage(rawText: string): string {
  const text = rawText.trim();
  return text.startsWith('[[')
    ? `Unresolved reference: ${text}`
    : `Unresolved reference: [[${text}]]`;
}

export function aliasCollisionMessage(normalizedAlias: string): string {
  return `Alias "${normalizedAlias}" is used by more than one page.`;
}

export function globalUnlinkedEntityMessage(title: string, codexType: string): string {
  return `"${title.trim()}": ${unlinkedEntityMessage(codexType, title)}`;
}

export function temporalPosthumousReferenceMessage(input: {
  characterTitle: string;
  deathDateLabel: string;
  sourceTitle: string;
  contentDateLabel: string;
}): string {
  return `${input.characterTitle} died ${input.deathDateLabel}; "${input.sourceTitle}" (${input.contentDateLabel}) still links them as a living reference.`;
}

export function temporalDissolvedOrgReferenceMessage(input: {
  orgTitle: string;
  dissolutionDateLabel: string;
  sourceTitle: string;
  contentDateLabel: string;
}): string {
  return `${input.orgTitle} dissolved ${input.dissolutionDateLabel}; "${input.sourceTitle}" (${input.contentDateLabel}) still references the organization as active.`;
}
