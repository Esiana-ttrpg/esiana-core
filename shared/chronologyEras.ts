/** Public chronology contracts: dates use the selected campaign calendar. Months are zero-based. */
export interface EraDate { year: number; month: number; day: number }
export type EraVisibility = 'PUBLIC' | 'PARTY' | 'DM_ONLY';
export interface ChronologyEra {
  id: string;
  calendarId: string;
  calendarName: string;
  isMasterTime: boolean;
  name: string;
  sortOrder: number;
  isCurrent: boolean;
  startDate: EraDate | null;
  endDate: EraDate | null;
  status: 'PAST' | 'FUTURE' | 'PRESENT';
  visibility: EraVisibility;
  slug?: string;
  slugAliases?: string[];
  overviewPageId: string | null;
  description: string | null;
  /** Read-only display projection; may include authorized wiki overview text. */
  overview: string;
  canManage: boolean;
}
export interface EraInput {
  calendarId: string;
  name: string;
  startDate: EraDate | null;
  endDate: EraDate | null;
  visibility: EraVisibility;
  isCurrent: boolean;
  description?: string | null;
}
export interface EraDeletionImpact {
  events: number;
  trajectories: number;
  recurringRules: number;
  overviewWords: number;
}
export function compareEraDates(a: EraDate, b: EraDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}
export function eraContainsDate(era: Pick<ChronologyEra, 'startDate' | 'endDate'>, date: EraDate): boolean {
  return (!era.startDate || compareEraDates(date, era.startDate) >= 0)
    && (!era.endDate || compareEraDates(date, era.endDate) <= 0);
}
