import type { CharacterFieldDescriptor, CharacterPageDescriptor } from '@shared/characterPages';

type CharacterResource = Pick<
  CharacterFieldDescriptor | CharacterPageDescriptor,
  'origin' | 'pluginId' | 'apiSourceName'
>;

export function characterResourceSourceLabel(resource: CharacterResource): string {
  if (resource.origin === 'PLUGIN') {
    return resource.pluginId ? `Plugin · ${resource.pluginId}` : 'Plugin';
  }
  if (resource.origin === 'API') {
    return resource.apiSourceName ? `External app · ${resource.apiSourceName}` : 'External app';
  }
  return resource.origin === 'CORE' ? 'Core' : 'User-created';
}

export function characterResourceDeleteWarning(
  resource: CharacterResource,
  label: string,
): string {
  if (resource.origin === 'API') {
    return `Delete ${label}? It was created by an external application and may be recreated during synchronization.`;
  }
  return `Delete ${label}?`;
}
