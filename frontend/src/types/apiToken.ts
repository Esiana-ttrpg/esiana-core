export type ApiTokenDurationDays = 30 | 90 | 365;

/** Known API token scopes — must match backend `API_TOKEN_SCOPES`. */
export type ApiTokenScope =
  | 'campaign:read'
  | 'campaign:write'
  | 'campaign:seed'
  | 'plugins:read'
  | 'plugins:manage';

export const API_TOKEN_SCOPES: readonly ApiTokenScope[] = [
  'campaign:read',
  'campaign:write',
  'campaign:seed',
  'plugins:read',
  'plugins:manage',
] as const;

export interface UserApiTokenSummary {
  id: string;
  name: string;
  expiresAt: string;
  createdAt: string;
  expired: boolean;
  scopes?: string[];
  isLegacy?: boolean;
}

export interface CreateUserApiTokenResult {
  token: UserApiTokenSummary;
  secret: string;
}
