import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { getWikiEditorMarkdown } from '@/components/wiki/createWikiEditor';
import {
  breakIntervalMs,
  loadBreakRemindersEnabled,
} from '@/lib/authoringPreferences';
import { sendWritingSessionHeartbeat } from '@/lib/authoringApi';
import {
  canCountActivityHeartbeat,
  shouldSendActivityHeartbeat,
} from '@shared/writingSession';

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function countWikiLinks(markdown: string): number {
  const bracketMatches = markdown.match(/\[\[[^\]]+\]\]/g);
  return bracketMatches?.length ?? 0;
}

function readOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function readVisible(): boolean {
  return typeof document === 'undefined' ? true : document.visibilityState === 'visible';
}

export interface EditorInstrumentationState {
  sessionWordDelta: number;
  sessionDurationMs: number;
  linksAdded: number;
  isFocused: boolean;
  breakNudgeVisible: boolean;
  dismissBreakNudge: () => void;
}

export interface UseEditorInstrumentationOptions {
  enabled?: boolean;
  campaignHandle?: string;
  pageId?: string;
  pageTitle?: string;
  onSessionFlush?: () => void;
}

export function useEditorInstrumentation(
  editor: Editor | null,
  options: UseEditorInstrumentationOptions = {},
): EditorInstrumentationState {
  const enabled = options.enabled !== false;
  const campaignHandle = options.campaignHandle;
  const pageId = options.pageId;
  const pageTitle = options.pageTitle;
  const onSessionFlushRef = useRef(options.onSessionFlush);
  onSessionFlushRef.current = options.onSessionFlush;

  const [sessionWordDelta, setSessionWordDelta] = useState(0);
  const [sessionDurationMs, setSessionDurationMs] = useState(0);
  const [linksAdded, setLinksAdded] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [breakNudgeVisible, setBreakNudgeVisible] = useState(false);

  const baselineWords = useRef(0);
  const baselineLinks = useRef(0);
  const focusStartedAt = useRef<number | null>(null);
  const accumulatedMs = useRef(0);
  const breakFired = useRef(false);
  const lastActivitySentAt = useRef<number | null>(null);
  const focusedRef = useRef(false);
  const clientInstanceKey = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `tab-${Math.random().toString(36).slice(2)}`,
  );

  const resetSession = useCallback(() => {
    if (!editor) return;
    const markdown = getWikiEditorMarkdown(editor);
    baselineWords.current = countWords(markdown);
    baselineLinks.current = countWikiLinks(markdown);
    setSessionWordDelta(0);
    setLinksAdded(0);
    accumulatedMs.current = 0;
    setSessionDurationMs(0);
    breakFired.current = false;
    setBreakNudgeVisible(false);
  }, [editor]);

  const sendHeartbeat = useCallback(
    async (kind: 'activity' | 'interval-end') => {
      if (!enabled || !editor) return;
      if (!campaignHandle || !pageId) return;
      const focused = kind === 'activity' ? true : isFocused;
      const visible = readVisible();
      const connected = readOnline();
      if (kind === 'activity' && !canCountActivityHeartbeat({ focused, visible, online: connected })) {
        return;
      }
      try {
        await sendWritingSessionHeartbeat(campaignHandle, {
          pageId,
          pageTitle: pageTitle ?? 'Untitled',
          clientInstanceKey: clientInstanceKey.current,
          kind,
          focused: kind === 'activity' ? true : false,
          visible,
          connected,
        });
        if (kind === 'activity') lastActivitySentAt.current = Date.now();
        if (kind === 'interval-end') onSessionFlushRef.current?.();
      } catch {
        /* best-effort telemetry */
      }
    },
    [enabled, editor, campaignHandle, pageId, pageTitle, isFocused],
  );

  const maybeSendActivity = useCallback(() => {
    if (!focusedRef.current) return;
    const now = Date.now();
    if (!shouldSendActivityHeartbeat(lastActivitySentAt.current, now)) return;
    void sendHeartbeat('activity');
  }, [sendHeartbeat]);

  useEffect(() => {
    if (!editor || !enabled) return;

    resetSession();

    const handleUpdate = () => {
      const markdown = getWikiEditorMarkdown(editor);
      const words = countWords(markdown);
      const links = countWikiLinks(markdown);
      setSessionWordDelta(words - baselineWords.current);
      setLinksAdded(Math.max(0, links - baselineLinks.current));
      maybeSendActivity();
    };

    const handleFocus = () => {
      focusedRef.current = true;
      setIsFocused(true);
      focusStartedAt.current = Date.now();
    };

    const handleBlur = () => {
      focusedRef.current = false;
      setIsFocused(false);
      if (focusStartedAt.current != null) {
        accumulatedMs.current += Date.now() - focusStartedAt.current;
        setSessionDurationMs(accumulatedMs.current);
        focusStartedAt.current = null;
      }
      void sendHeartbeat('interval-end');
    };

    editor.on('update', handleUpdate);
    editor.on('focus', handleFocus);
    editor.on('blur', handleBlur);

    return () => {
      editor.off('update', handleUpdate);
      editor.off('focus', handleFocus);
      editor.off('blur', handleBlur);
    };
  }, [editor, enabled, maybeSendActivity, resetSession, sendHeartbeat]);

  useEffect(() => {
    if (!enabled) return;

    const endInterval = () => {
      void sendHeartbeat('interval-end');
    };
    const handleVisibility = () => {
      if (!readVisible()) endInterval();
    };
    const handleOffline = () => {
      endInterval();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pagehide', endInterval);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pagehide', endInterval);
    };
  }, [enabled, sendHeartbeat]);

  useEffect(() => {
    if (!enabled || !isFocused) return;

    const tick = window.setInterval(() => {
      if (focusStartedAt.current == null) return;
      const live = accumulatedMs.current + (Date.now() - focusStartedAt.current);
      setSessionDurationMs(live);

      if (
        loadBreakRemindersEnabled() &&
        !breakFired.current &&
        live >= breakIntervalMs()
      ) {
        breakFired.current = true;
        setBreakNudgeVisible(true);
      }
    }, 1000);

    return () => window.clearInterval(tick);
  }, [enabled, isFocused]);

  const dismissBreakNudge = useCallback(() => {
    setBreakNudgeVisible(false);
    breakFired.current = false;
    accumulatedMs.current = 0;
    focusStartedAt.current = Date.now();
    setSessionDurationMs(0);
  }, []);

  return useMemo(
    () => ({
      sessionWordDelta,
      sessionDurationMs,
      linksAdded,
      isFocused,
      breakNudgeVisible,
      dismissBreakNudge,
    }),
    [
      sessionWordDelta,
      sessionDurationMs,
      linksAdded,
      isFocused,
      breakNudgeVisible,
      dismissBreakNudge,
    ],
  );
}
