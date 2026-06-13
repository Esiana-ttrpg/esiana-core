/** Coarse capability domains — avoid fine-grained permission explosion. */
export const PLUGIN_PERMISSIONS = [
  'storage:provider',
  'plugin:data',
  'data:interceptor',
  'network:fetch',
  'feed:public',
  'wiki:read-public',
  'feed:opds',
  'ui:slot',
  'wiki:decorate',
  'campaign:seed',
  'world-development:provider',
  'campaign:read-calendar',
  'campaign:read-timeline',
  'campaign:read-party',
  'campaign:read-world',
  'campaign:read-lore',
  'campaign:read-maps',
  'plugin:config',
  'plugin:secrets',
  'plugin:assets',
  'campaign:import',
] as const;

export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

const PERMISSION_SET = new Set<string>(PLUGIN_PERMISSIONS);

export function isKnownPluginPermission(value: string): value is PluginPermission {
  return PERMISSION_SET.has(value);
}

export function validatePluginPermissions(
  permissions: string[] | undefined,
  options?: { strict?: boolean },
): { permissions: string[]; warnings: string[] } {
  if (!permissions?.length) {
    return { permissions: [], warnings: [] };
  }

  const warnings: string[] = [];
  const valid: string[] = [];

  for (const permission of permissions) {
    if (isKnownPluginPermission(permission)) {
      valid.push(permission);
    } else if (options?.strict) {
      throw new Error(`Unknown plugin permission: "${permission}"`);
    } else {
      warnings.push(`Unknown plugin permission "${permission}" — allowed but not in official registry`);
      valid.push(permission);
    }
  }

  return { permissions: valid, warnings };
}
