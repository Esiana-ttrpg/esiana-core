import { apiFetch } from './api';
import type { ChronologyEra, EraInput, EraDeletionImpact } from '@shared/chronologyEras';
const path = (campaign: string) => `/campaigns/${campaign}/chronology/eras`;
export const fetchEras = (campaign: string) => apiFetch<{ eras: ChronologyEra[] }>(path(campaign));
export const saveEra = (campaign: string, input: EraInput, id?: string) => apiFetch<{ era: ChronologyEra }>(`${path(campaign)}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) });
export const reorderEras = (campaign: string, calendarId: string, ids: string[]) => apiFetch(`${path(campaign)}/order`, { method: 'PUT', body: JSON.stringify({ calendarId, ids }) });
export const fetchEraImpact = (campaign: string, id: string) => apiFetch<EraDeletionImpact>(`${path(campaign)}/${id}/impact`);
export const deleteEra = (campaign: string, id: string) => apiFetch(`${path(campaign)}/${id}`, { method: 'DELETE', body: JSON.stringify({ confirmed: true }) });
