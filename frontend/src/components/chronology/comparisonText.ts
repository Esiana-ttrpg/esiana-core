import { useTranslation } from 'react-i18next';
import messages from '@/i18n/en/campaign/timelinecomparison.json';
import { historicalNativeState, type HistoricalAxis, type HistoricalInterval } from '@/lib/historicalTimeline';

type Key = keyof typeof messages extends `campaign.timelinecomparison.${infer K}` ? K : never;
export function useComparisonText() {
  const { t } = useTranslation();
  return (key: Key, values: Record<string, string | number> = {}) => {
    const full: keyof typeof messages = `campaign.timelinecomparison.${key}`;
    return t(full, { defaultValue: messages[full], ...values });
  };
}
export type ComparisonText = ReturnType<typeof useComparisonText>;
export function comparisonDateLabel(axis: HistoricalAxis, minute: bigint, text: ComparisonText, includeTime = false): string {
  const state = historicalNativeState(axis, minute);
  if (!state) return text('dateUnavailable');
  const date = text('date', { month: state.monthName, day: state.day, year: state.year });
  return includeTime && (state.hour || state.minute) ? text('dateTime', { date, hour: state.hour, minute: String(state.minute).padStart(2, '0') }) : date;
}
export function comparisonIntervalLabel(row: HistoricalInterval, axis: HistoricalAxis, text: ComparisonText) {
  return text('interval', { title: row.representative.title, start: comparisonDateLabel(axis, row.start, text),
    end: comparisonDateLabel(axis, row.end - 1440n, text), importance: text(row.representative.importance.toLowerCase() as 'major' | 'minor' | 'notice'),
    duration: row.representative.duration });
}
