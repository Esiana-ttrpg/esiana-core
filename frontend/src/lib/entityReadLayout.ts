export function isEntityReaderFirst(templateType: string, isDMUser: boolean): boolean {
  return !isDMUser && (templateType === 'ORGANIZATION' || templateType === 'FAMILY');
}
