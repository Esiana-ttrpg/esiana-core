const INSTRUMENTATION_STRIP_KEY = 'esiana.authoring.instrumentationStrip';
const BREAK_REMINDERS_KEY = 'esiana.authoring.breakReminders';
const BREAK_INTERVAL_MS_KEY = 'esiana.authoring.breakIntervalMinutes';

const DEFAULT_BREAK_INTERVAL_MINUTES = 45;

export function loadInstrumentationStripEnabled(): boolean {
  try {
    return window.localStorage.getItem(INSTRUMENTATION_STRIP_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveInstrumentationStripEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(INSTRUMENTATION_STRIP_KEY, enabled ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

export function loadBreakRemindersEnabled(): boolean {
  try {
    return window.localStorage.getItem(BREAK_REMINDERS_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveBreakRemindersEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(BREAK_REMINDERS_KEY, enabled ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

export function loadBreakIntervalMinutes(): number {
  try {
    const raw = window.localStorage.getItem(BREAK_INTERVAL_MS_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed) && parsed >= 15 && parsed <= 180) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_BREAK_INTERVAL_MINUTES;
}

export function saveBreakIntervalMinutes(minutes: number): void {
  const clamped = Math.max(15, Math.min(180, Math.floor(minutes)));
  try {
    window.localStorage.setItem(BREAK_INTERVAL_MS_KEY, String(clamped));
  } catch {
    /* ignore */
  }
}

export function breakIntervalMs(): number {
  return loadBreakIntervalMinutes() * 60 * 1000;
}
