export type SystemLogLevel = 'info' | 'warn' | 'error';

export interface SystemLogEntry {
  id: number;
  level: SystemLogLevel;
  message: string;
  timestamp: string;
}

const MAX_ENTRIES = 250;
const buffer: SystemLogEntry[] = [];
let nextId = 1;
let installed = false;

function formatArg(value: unknown): string {
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function appendSystemLog(level: SystemLogLevel, message: string): void {
  buffer.push({
    id: nextId++,
    level,
    message: message.trim() || '(empty)',
    timestamp: new Date().toISOString(),
  });
  if (buffer.length > MAX_ENTRIES) {
    buffer.splice(0, buffer.length - MAX_ENTRIES);
  }
}

export function getRecentSystemLogs(limit = 100): SystemLogEntry[] {
  return buffer.slice(-limit).reverse();
}

/** Tap console warn/error (and bootstrap info) into the in-memory diagnostics feed. */
export function installSystemLogCapture(): void {
  if (installed) return;
  installed = true;

  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  console.warn = (...args: unknown[]) => {
    appendSystemLog('warn', args.map(formatArg).join(' '));
    originalWarn(...args);
  };

  console.error = (...args: unknown[]) => {
    appendSystemLog('error', args.map(formatArg).join(' '));
    originalError(...args);
  };

  appendSystemLog('info', 'System diagnostics log feed initialized');
}
