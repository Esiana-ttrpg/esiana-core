import type {
  CharacterPageDescriptor,
  CharacterPageDisplayMode,
  CharacterFieldDescriptor,
  PluginCharacterPagePermissions,
} from '@shared/characterPages';

export interface PluginCharacterPageContext<TPluginData = unknown> {
  character: { id: string; title: string; visibility: string };
  campaign: { handle: string };
  page: CharacterPageDescriptor;
  pluginData: TPluginData;
  /** Representation-independent fields declared by this provider page. */
  fields: CharacterFieldDescriptor[];
  permissions: PluginCharacterPagePermissions;
  displayMode: CharacterPageDisplayMode;
  signal: AbortSignal;
  updatePluginData(data: TPluginData): Promise<{ data: TPluginData; schemaVersion: number }>;
  updateField(fieldId: string, value: unknown): Promise<CharacterFieldDescriptor>;
  core: Readonly<Record<string, never>>;
}

export type PluginCharacterPageRenderer = (
  root: HTMLElement,
  context: PluginCharacterPageContext,
) => void | (() => void) | Promise<void | (() => void)>;

export interface RegisteredPluginCharacterPageRenderer {
  pluginId: string;
  key: string;
  render: PluginCharacterPageRenderer;
  exportToCanvas?: (context: PluginCharacterPageContext) => Promise<Array<Record<string, unknown>>>;
}

const renderers = new Map<string, RegisteredPluginCharacterPageRenderer>();

export function registerPluginCharacterPageRenderer(
  pluginId: string,
  definition: Omit<RegisteredPluginCharacterPageRenderer, 'pluginId'>,
): void {
  renderers.set(`${pluginId}:${definition.key}`, { ...definition, pluginId });
}

export function getPluginCharacterPageRenderer(
  pluginId: string,
  key: string,
): RegisteredPluginCharacterPageRenderer | undefined {
  return renderers.get(`${pluginId}:${key}`);
}

export function clearPluginCharacterPageRenderers(): void {
  renderers.clear();
}
