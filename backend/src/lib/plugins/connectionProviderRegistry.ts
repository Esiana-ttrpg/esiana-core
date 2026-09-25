export type ConnectionOwnerType = 'campaign' | 'user';

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
  ownership?: ConnectionOwnerType[];
  auth: ConnectionAuthDefinition;
}

const providers = new Map<string, ConnectionProviderDefinition>();

export function registerConnectionProvider(pluginId: string, definition: ConnectionProviderDefinition): void {
  if (definition.id !== pluginId) throw new Error(`Plugin "${pluginId}" connection provider id must match its plugin id`);
  if (providers.has(pluginId)) throw new Error(`Connection provider "${pluginId}" is already registered`);
  if (definition.auth.type === 'apiKey') {
    const name = definition.auth.headerName.toLowerCase();
    if (!/^[a-z0-9-]+$/.test(name) || ['authorization', 'cookie', 'host'].includes(name) || name.startsWith('x-forwarded-')) {
      throw new Error('API key header name is not allowed');
    }
  }
  providers.set(pluginId, { ...definition, ownership: definition.ownership?.length ? definition.ownership : ['campaign', 'user'] });
}

export function getConnectionProvider(pluginId: string): ConnectionProviderDefinition | undefined { return providers.get(pluginId); }
export function clearConnectionProviderRegistry(): void { providers.clear(); }
