export interface OAuth2ConnectionDefinition {
  type: 'oauth2';
  authorizationUrl: string;
  tokenUrl: string;
  revocationUrl?: string;
  scopes: string[];
  clientAuth?: 'basic' | 'body' | 'none';
}

export interface ApiKeyConnectionDefinition {
  type: 'apiKey';
  headerName: string;
  prefix?: string;
}

export interface BearerConnectionDefinition { type: 'bearer' }
export type ConnectionAuthDefinition = OAuth2ConnectionDefinition | ApiKeyConnectionDefinition | BearerConnectionDefinition;

export interface ConnectionProviderDefinition {
  id: string;
  displayName: string;
  auth: ConnectionAuthDefinition;
  /** Exact subset of manifest outboundOrigins eligible for resource credentials. */
  resourceOrigins: string[];
}

const providers = new Map<string, ConnectionProviderDefinition>();

export function registerConnectionProvider(pluginId: string, definition: ConnectionProviderDefinition, manifestOrigins: string[] = []): void {
  if (definition.id !== pluginId) throw new Error(`Plugin "${pluginId}" connection provider id must match its plugin id`);
  if (providers.has(pluginId)) throw new Error(`Connection provider "${pluginId}" is already registered`);
  if (!definition.resourceOrigins.length || definition.resourceOrigins.some((origin) => !manifestOrigins.includes(origin))) throw new Error('Connection provider resourceOrigins must be a non-empty subset of manifest outboundOrigins');
  if (definition.auth.type === 'oauth2') {
    for (const endpoint of [definition.auth.authorizationUrl, definition.auth.tokenUrl, definition.auth.revocationUrl].filter((value): value is string => Boolean(value))) {
      if (!manifestOrigins.includes(new URL(endpoint).origin)) throw new Error('OAuth endpoint origin must be declared in manifest outboundOrigins');
    }
  }
  if (definition.auth.type === 'apiKey') {
    const name = definition.auth.headerName.toLowerCase();
    if (!/^[a-z0-9-]+$/.test(name) || ['authorization', 'cookie', 'host'].includes(name) || name.startsWith('x-forwarded-')) {
      throw new Error('API key header name is not allowed');
    }
  }
  providers.set(pluginId, { ...definition, resourceOrigins: [...new Set(definition.resourceOrigins)] });
}

export function getConnectionProvider(pluginId: string): ConnectionProviderDefinition | undefined { return providers.get(pluginId); }
export function clearConnectionProviderRegistry(): void { providers.clear(); }
