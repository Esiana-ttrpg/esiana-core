import type { ThemeDefinition } from './theme/themeTypes';
import type { PluginSlotContext, PluginSlotRenderer } from '@/plugins/slots/types';

/** Theme contributed by a plugin (extends core presets). */
export interface PluginTheme extends Omit<ThemeDefinition, 'name'> {
  name: string;
  pluginId: string;
}

/** Custom field metadata for wiki or entity editors. */
export interface CustomFieldDefinition {
  id: string;
  pluginId: string;
  label: string;
  entity: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'markdown';
  options?: string[];
  defaultValue?: string | number | boolean;
}

export interface DashboardWidgetConfig {
  [key: string]: unknown;
}

export type DashboardWidgetSettingsRenderer = (
  root: HTMLElement,
  context: PluginSlotContext,
  widgetConfig: DashboardWidgetConfig,
  saveConfig: (partial: DashboardWidgetConfig) => void,
) => void | (() => void) | Promise<void | (() => void)>;

/** Layout widget descriptor for dashboard/editor slots. */
export interface LayoutWidget {
  id: string;
  pluginId: string;
  slot: string;
  title: string;
  minWidth?: number;
  minHeight?: number;
  minW?: number;
  minH?: number;
  render?: (
    root: HTMLElement,
    context: PluginSlotContext,
    widgetConfig: DashboardWidgetConfig,
  ) => ReturnType<PluginSlotRenderer>;
  renderSettings?: DashboardWidgetSettingsRenderer;
}

const pluginThemes = new Map<string, PluginTheme>();
const customFields = new Map<string, CustomFieldDefinition>();
const layoutWidgets = new Map<string, LayoutWidget>();

export function registerPluginTheme(theme: PluginTheme): void {
  pluginThemes.set(`${theme.pluginId}:${theme.name}`, theme);
}

export function registerCustomField(field: CustomFieldDefinition): void {
  customFields.set(`${field.pluginId}:${field.id}`, field);
}

export function registerLayoutWidget(widget: LayoutWidget): void {
  layoutWidgets.set(`${widget.pluginId}:${widget.id}`, widget);
}

/** Alias documented for plugin authors. */
export const registerDashboardWidget = registerLayoutWidget;

export function listPluginThemes(): PluginTheme[] {
  return [...pluginThemes.values()];
}

export function listCustomFields(entity?: string): CustomFieldDefinition[] {
  const all = [...customFields.values()];
  return entity ? all.filter((field) => field.entity === entity) : all;
}

export function listLayoutWidgets(slot?: string): LayoutWidget[] {
  const all = [...layoutWidgets.values()];
  return slot ? all.filter((widget) => widget.slot === slot) : all;
}

export function getLayoutWidget(pluginId: string, widgetId: string): LayoutWidget | undefined {
  return layoutWidgets.get(`${pluginId}:${widgetId}`);
}

export function buildPluginWidgetPlacementId(pluginId: string, widgetId: string): string {
  return `plugin:${pluginId}:${widgetId}`;
}

export function parsePluginWidgetPlacementId(
  id: string,
): { pluginId: string; widgetId: string } | null {
  if (!id.startsWith('plugin:')) return null;
  const parts = id.split(':');
  if (parts.length < 3) return null;
  return { pluginId: parts[1], widgetId: parts.slice(2).join(':') };
}

export function clearPluginPresentationRegistry(): void {
  pluginThemes.clear();
  customFields.clear();
  layoutWidgets.clear();
}
