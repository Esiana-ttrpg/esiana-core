export type ApiTokenDurationDays = 30 | 90 | 365;

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
