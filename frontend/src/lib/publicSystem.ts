import { apiFetch } from '@/lib/api';
import type { PublicSystemStatus } from '@/types/admin';

export async function fetchPublicSystemStatus(): Promise<PublicSystemStatus> {
  return apiFetch<PublicSystemStatus>('/public/system/status');
}
