import { apiFetch } from '@/lib/api';

export type UserQuota = {
  window: {
    start: string;
    end: string;
    resetInMs: number;
    timezone: 'UTC';
  };
  quota: {
    used: number;
    limit: number;
    remaining: number;
    usagePct: number;
  };
};

export async function fetchUserQuota(): Promise<UserQuota> {
  return apiFetch<UserQuota>('/user/developer/quota');
}
