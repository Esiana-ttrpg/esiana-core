import { useState } from 'react';
import type { EditorInstrumentationState } from '@/hooks/useEditorInstrumentation';
import {
  loadBreakRemindersEnabled,
  loadInstrumentationStripEnabled,
  saveBreakRemindersEnabled,
  saveInstrumentationStripEnabled,
} from '@/lib/authoringPreferences';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

interface EditorInstrumentationStripProps {
  instrumentation: EditorInstrumentationState;
  visible?: boolean;
}

export function EditorInstrumentationStrip({
  instrumentation,
  visible = loadInstrumentationStripEnabled(),
}: EditorInstrumentationStripProps) {
  const [stripEnabled, setStripEnabled] = useState(visible);
  const [breakReminders, setBreakReminders] = useState(loadBreakRemindersEnabled());

  if (!stripEnabled && !instrumentation.breakNudgeVisible) {
    return (
      <div className="flex justify-end border-t border-border/50 px-3 py-1">
        <button
          type="button"
          className="text-[10px] text-muted-foreground hover:text-foreground"
          onClick={() => {
            setStripEnabled(true);
            saveInstrumentationStripEnabled(true);
          }}
        >
          Show writing session
        </button>
      </div>
    );
  }

  const { sessionWordDelta, sessionDurationMs, linksAdded, breakNudgeVisible, dismissBreakNudge } =
    instrumentation;

  return (
    <div className="space-y-1 border-t border-border/50 px-3 py-2 text-[11px] text-muted-foreground">
      {breakNudgeVisible ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-muted/30 px-2 py-1.5 text-foreground">
          <span>You&apos;ve been writing for a while — a short break can help.</span>
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={dismissBreakNudge}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          Session · {formatDuration(sessionDurationMs)}
          {sessionWordDelta !== 0 ? (
            <span>
              {' '}
              · {sessionWordDelta > 0 ? '+' : ''}
              {sessionWordDelta} words
            </span>
          ) : null}
          {linksAdded > 0 ? <span> · {linksAdded} links added</span> : null}
        </span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={breakReminders}
              onChange={(e) => {
                setBreakReminders(e.target.checked);
                saveBreakRemindersEnabled(e.target.checked);
              }}
              className="rounded border-border"
            />
            Break reminders
          </label>
          <button
            type="button"
            className="hover:text-foreground"
            onClick={() => {
              setStripEnabled(false);
              saveInstrumentationStripEnabled(false);
            }}
          >
            Hide
          </button>
        </div>
      </div>
    </div>
  );
}
