import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor, Extensions } from '@tiptap/react';
import type { BracketSuggestionState } from './extensions/wikiBracketSuggestionPlugin';
import {
  insertWikiReference,
  WikiBracketSuggestionExtension,
} from './extensions/wikiBracketSuggestionPlugin';
import {
  WikiSlashSuggestionExtension,
  type SlashSuggestionState,
} from './extensions/slashSuggestionPlugin';
import { WikiBracketSuggestionPopover } from './WikiBracketSuggestionPopover';
import { WikiSlashSuggestionPopover } from './WikiSlashSuggestionPopover';
import { useWikiLinkIndex } from './hooks/useWikiLinkIndex';
import { buildWikiLinkHtml } from './extensions/WikiLinkExtension';
import { normalizeAlias } from '@/lib/normalizeAlias';
import {
  fetchMentionTargets,
  type MentionTarget,
  type WikiLinkIndexEntry,
} from '@/lib/wikiLoreGraph';
import {
  AtMentionSuggestionExtension,
  filterMentionTargets,
  insertSocialMention,
  type AtSuggestionState,
  type MentionTarget as AtTarget,
} from './extensions/atMentionSuggestionPlugin';
import { WikiAmbientRecognitionExtension } from './extensions/wikiAmbientRecognition';
import { useOptionalWiki } from '@/contexts/WikiContext';
import { collectWikiLinkTargetIdsFromEditor } from './extensions/wikiReferenceInsertion';

function mapApiMentionTarget(t: MentionTarget): AtTarget {
  return {
    mentionType: t.mentionType === 'CHARACTER' ? 'character' : 'user',
    label: t.label,
    targetUserId: t.targetUserId,
    identityPageId: t.identityPageId,
  };
}

export function useWikiEditorLoreExtensions(campaignHandle: string | undefined) {
  const wiki = useOptionalWiki();
  const { index } = useWikiLinkIndex(campaignHandle);
  const pinnedPageIds = useMemo(
    () => (wiki?.pinnedShortcuts ?? []).map((pin) => pin.pageId),
    [wiki?.pinnedShortcuts],
  );
  const [bracketState, setBracketState] = useState<BracketSuggestionState | null>(null);
  const [slashState, setSlashState] = useState<SlashSuggestionState | null>(null);
  const [atState, setAtState] = useState<AtSuggestionState | null>(null);
  const [mentionTargets, setMentionTargets] = useState<AtTarget[]>([]);
  const [ambientEnabled, setAmbientEnabled] = useState(false);

  useEffect(() => {
    if (!campaignHandle) {
      setMentionTargets([]);
      return;
    }
    fetchMentionTargets(campaignHandle)
      .then((rows) => setMentionTargets(rows.map(mapApiMentionTarget)))
      .catch(() => setMentionTargets([]));
  }, [campaignHandle]);

  const bracketExtension = useMemo(
    () =>
      WikiBracketSuggestionExtension.configure({
        onStateChange: setBracketState,
      }),
    [],
  );

  const slashExtension = useMemo(
    () =>
      WikiSlashSuggestionExtension.configure({
        onStateChange: setSlashState,
      }),
    [],
  );

  const atExtension = useMemo(
    () =>
      AtMentionSuggestionExtension.configure({
        onStateChange: setAtState,
      }),
    [],
  );

  const ambientExtension = useMemo(
    () =>
      WikiAmbientRecognitionExtension.configure({
        enabled: ambientEnabled,
        getIndex: () => index,
      }),
    [ambientEnabled, index],
  );

  const loreExtensions: Extensions = useMemo(
    () => [bracketExtension, slashExtension, atExtension, ambientExtension],
    [bracketExtension, slashExtension, atExtension, ambientExtension],
  );

  const resolveEntryByLabel = useCallback(
    (label: string): WikiLinkIndexEntry | undefined => {
      const norm = normalizeAlias(label);
      return index.find((e) => e.normalizedLabel === norm);
    },
    [index],
  );

  const insertWikiReferenceAtRange = useCallback(
    (
      editor: Editor | null,
      range: { from: number; to: number },
      label: string,
    ) => {
      if (!editor) return;
      const match = resolveEntryByLabel(label);
      if (match) {
        insertWikiReference(editor.view, range, match);
      } else {
        insertWikiReference(editor.view, range, { label, resolved: false });
      }
    },
    [resolveEntryByLabel],
  );

  const openMentionFromSlash = useCallback((editor: Editor | null) => {
    if (!editor || !slashState) return;
    const { from, to } = slashState;
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContent('@')
      .run();
    setSlashState(null);
  }, [slashState]);

  const BracketPopover = useCallback(
    ({ editor }: { editor: Editor | null }) => {
      if (!bracketState || !editor) return null;
      return (
        <WikiBracketSuggestionPopover
          state={bracketState}
          index={index}
          onSelect={(entry) => {
            insertWikiReference(editor.view, bracketState, entry);
            setBracketState(null);
          }}
          onCreateStub={(label) => {
            insertWikiReferenceAtRange(editor, bracketState, label);
            setBracketState(null);
          }}
          onClose={() => setBracketState(null)}
        />
      );
    },
    [bracketState, index, insertWikiReferenceAtRange],
  );

  const SlashPopover = useCallback(
    ({ editor }: { editor: Editor | null }) => {
      if (!slashState || !editor) return null;
      const suggestionOptions = {
        currentPageLinkedIds: collectWikiLinkTargetIdsFromEditor(editor),
        pinnedPageIds,
      };
      return (
        <WikiSlashSuggestionPopover
          state={slashState}
          index={index}
          suggestionOptions={suggestionOptions}
          onSelect={(entry) => {
            insertWikiReference(editor.view, slashState, entry);
            setSlashState(null);
          }}
          onCreateStub={(label) => {
            insertWikiReferenceAtRange(editor, slashState, label);
            setSlashState(null);
          }}
          onMentionPlayer={() => openMentionFromSlash(editor)}
          onClose={() => setSlashState(null)}
        />
      );
    },
    [slashState, index, insertWikiReferenceAtRange, openMentionFromSlash, pinnedPageIds],
  );

  const AtPopover = useCallback(
    ({ editor }: { editor: Editor | null }) => {
      if (!atState || !editor) return null;
      const matches = filterMentionTargets(mentionTargets, atState.query);
      return createPortal(
        <div
          className="fixed z-[200] min-w-[200px] rounded-lg border border-border bg-background shadow-lg"
          style={{ top: atState.top, left: atState.left }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setAtState(null);
            }
          }}
        >
          <div className={`border-b border-border px-3 py-2 ${META_SECTION_LABEL_CLASS}`}>
            Mention
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {matches.map((t) => (
              <li key={`${t.mentionType}-${t.label}`}>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted/30"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertSocialMention(editor.view, atState, t);
                    setAtState(null);
                  }}
                >
                  @{t.label}
                  <span className="ml-1 text-xs text-muted">
                    {t.mentionType === 'character' ? 'character' : 'player'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      );
    },
    [atState, mentionTargets],
  );

  const LorePopovers = useCallback(
    ({ editor }: { editor: Editor | null }) => (
      <>
        <BracketPopover editor={editor} />
        <SlashPopover editor={editor} />
        <AtPopover editor={editor} />
      </>
    ),
    [BracketPopover, SlashPopover, AtPopover],
  );

  return {
    loreExtensions,
    LorePopovers,
    linkIndex: index,
    resolveEntryByLabel,
    ambientEnabled,
    setAmbientEnabled,
  };
}

export function WikiSyntaxHint({
  ambientEnabled,
  onAmbientToggle,
}: {
  ambientEnabled?: boolean;
  onAmbientToggle?: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-[10px] text-muted">
      <span>
        <span className="text-foreground/80">[[Name]]</span> links the codex ·{' '}
        <span className="text-foreground/80">/Name</span> quick reference ·{' '}
        <span className="text-foreground/80">@Name</span> notifies a player
      </span>
      {onAmbientToggle ? (
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={ambientEnabled}
            onChange={(e) => onAmbientToggle(e.target.checked)}
          />
          Ambient hints
        </label>
      ) : null}
    </div>
  );
}

export function useCodexLinkBridge(
  editor: Editor | null,
  markdown: string,
  resolveEntryByLabel: (label: string) => WikiLinkIndexEntry | undefined,
) {
  return useMemo(() => {
    if (!editor || !markdown) return [];
    const atMatches = [...markdown.matchAll(/@([A-Za-z0-9][\w\s'-]{0,40})/g)];
    const out: string[] = [];
    for (const m of atMatches) {
      const label = m[1].trim();
      if (!label) continue;
      const bracket = `[[${label}]]`;
      if (markdown.includes(bracket)) continue;
      const entry = resolveEntryByLabel(label);
      if (entry) out.push(label);
    }
    return [...new Set(out)].slice(0, 3);
  }, [editor, markdown, resolveEntryByLabel]);
}

export function CodexLinkBridgeChips({
  editor,
  labels,
  resolveEntryByLabel,
}: {
  editor: Editor | null;
  labels: string[];
  resolveEntryByLabel: (label: string) => WikiLinkIndexEntry | undefined;
}) {
  if (!editor || labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 border-b border-border px-3 py-2">
      {labels.map((label) => (
        <button
          key={label}
          type="button"
          className="rounded-full border border-border bg-muted/20 px-2 py-0.5 text-[11px] text-muted hover:text-foreground"
          onClick={() => {
            const match = resolveEntryByLabel(label);
            editor
              .chain()
              .focus()
              .insertContent(
                buildWikiLinkHtml({
                  targetPageId: match?.pageId ?? null,
                  label: match?.label ?? label,
                  resolved: Boolean(match?.pageId),
                }),
              )
              .run();
          }}
        >
          Add codex link [[{label}]]?
        </button>
      ))}
    </div>
  );
}
