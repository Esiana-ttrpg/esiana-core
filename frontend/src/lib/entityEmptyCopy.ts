export function relationshipsEmptyCopy(templateType: string): string {
  switch (templateType) {
    case 'CHARACTER':
      return 'No known allegiances at campaign time.';
    case 'FAMILY':
      return 'No head of house or bloodline root linked yet.';
    case 'ORGANIZATION':
      return 'No active diplomatic tensions recorded at campaign time.';
    default:
      return 'No relationships recorded for this page.';
  }
}

export const ENTITY_EMPTY_COPY = {
  orgMembers: 'No members sworn to this organization at campaign time.',
  orgRelations: 'No outward relations on record at campaign time.',
  familyLiving: 'No living members in this house at campaign time.',
  familyGenerations:
    'No characters linked to this family yet. Link characters in page settings.',
  previewNote: 'No timeline note for this relation.',
} as const;
