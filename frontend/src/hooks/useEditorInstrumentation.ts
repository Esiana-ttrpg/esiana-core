import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { getWikiEditorMarkdown } from '@/components/wiki/createWikiEditor';
import {
  breakIntervalMs,
  loadBreakRemindersEnabled,
} from '@/lib/authoringPreferences';
import { flushWritingSession } from '@/lib/authoringApi';

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function countWikiLinks(markdown: string): number {
  const bracketMatches = markdown.match(/\[\[[^\]]+\]\]/g);
  return bracketMatches?.length ?? 0;
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
  const [sessionWordDelta, setSessionWordDelta] = useState(0);
  const [sessionDurationMs, setSessionDurationMs] = useState(0);
  const [linksAdded, setLinksAdded] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [breakNudgeVisible, setBreakNudgeVisible] = useState(false);

  const baselineWords = useRef(0);
  const baselineLinks = useRef(0);
  const focusStartedAt = useRef<number | null>(null);
  const accumulatedMs = useRef(0);
  const flushed = useRef(false);
  const breakFired = useRef(false);

  const resetSession = useCallback(() => {
    if (!editor) return;
    const markdown = getWikiEditorMarkdown(editor);
    baselineWords.current = countWords(markdown);
    baselineLinks.current = countWikiLinks(markdown);
    setSessionWordDelta(0);
    setLinksAdded(0);
    accumulatedMs.current = 0;
    setSessionDurationMs(0);
    flushed.current = false;
    breakFired.current = false;
    setBreakNudgeVisible(false);
  }, [editor]);

  const flushSession = useCallback(async () => {
    if (!enabled || flushed.current || !editor) return;
    if (!options.campaignHandle || !options.pageId) return;

    const markdown = getWikiEditorMarkdown(editor);
    const wordDelta = countWords(markdown) - baselineWords.current;
    const linkDelta = Math.max(0, countWikiLinks(markdown) - baselineLinks.current);
    const durationMs = accumulatedMs.current;

    if (durationMs < 1000 && wordDelta === 0 && linkDelta === 0) return;

    flushed.current = true;
    try {
      await flushWritingSession(options.campaignHandle, {
        pageId: options.pageId,
        pageTitle: options.pageTitle ?? 'Untitled',
        durationMs,
        wordDelta,
        linksAdded: linkDelta,
      });
      options.onSessionFlush?.();
    } catch {
      flushed.current = false;
    }
  }, [enabled, editor, options]);

  useEffect(() => {
    if (!editor || !enabled) return;

    resetSession();

    const handleUpdate = () => {
      const markdown = getWikiEditorMarkdown(editor);
      const words = countWords(markdown);
      const links = countWikiLinks(markdown);
      setSessionWordDelta(words - baselineWords.current);
      setLinksAdded(Math.max(0, links - baselineLinks.current));
    };

    const handleFocus = () => {
      setIsFocused(true);
      focusStartedAt.current = Date.now();
    };

    const handleBlur = () => {
      setIsFocused(false);
      if (focusStartedAt.current != null) {
        accumulatedMs.current += Date.now() - focusStartedAt.current;
        setSessionDurationMs(accumulatedMs.current);
        focusStartedAt.current = null;
      }
      void flushSession();
    };

    editor.on('update', handleUpdate);
    editor.on('focus', handleFocus);
    editor.on('blur', handleBlur);

    return () => {
      editor.off('update', handleUpdate);
      editor.off('focus', handleFocus);
      editor.off('blur', handleBlur);
    };
  }, [editor, enabled, flushSession, resetSession]);

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

  return {
    sessionWordDelta,
    sessionDurationMs,
    linksAdded,
    isFocused,
    breakNudgeVisible,
    dismissBreakNudge,
  };
}
