export const BLOCKED_ROUTE_PREFIXES = [
  '/api/admin',
  '/api/auth',
  '/api/system',
  '/api/campaigns',
  '/api/user',
  '/api/health',
  '/api/plugins',
  '/api/plugin-runtime',
] as const;

export function validatePluginRoutePath(pluginId: string, routePath: string): void {
  if (typeof routePath !== 'string' || !routePath.trim()) {
    return;
  }

  if (routePath.includes('..')) {
    throw new Error(`Plugin "${pluginId}" cannot register route with "..": ${routePath}`);
  }

  const normalized = routePath.startsWith('/') ? routePath : `/${routePath}`;

  if (normalized.startsWith('/api/')) {
    throw new Error(
      `Plugin "${pluginId}" cannot register absolute API path "${routePath}" — use relative paths under the plugin mount`,
    );
  }

  for (const blocked of BLOCKED_ROUTE_PREFIXES) {
    if (normalized === blocked || normalized.startsWith(`${blocked}/`)) {
      throw new Error(`Plugin "${pluginId}" cannot register routes under ${blocked}`);
    }
  }
}
