import { useOptionalAdventureWorkspace } from '@/contexts/AdventureWorkspaceContext';
import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { OPEN_SOURCE_PICKER_EVENT, SourcePicker, type SourcePickerRequest } from './SourcePicker';
import { SOURCE_REFERENCE_INTERACT_EVENT } from './extensions/SourceReferenceExtension';
import { SourceReferencePopover, type SourceInteraction } from './SourceReferencePopover';

export const OPEN_WIKI_PROVIDER_EVENT = 'esiana:open-wiki-editor-provider';
export type WikiProviderKind = 'commands' | 'references' | 'mentions';

function mapApiMentionTarget(t: MentionTarget): AtTarget {
  return {
    mentionType: t.mentionType === 'CHARACTER' ? 'character' : 'user',
    label: t.label,
    targetUserId: t.targetUserId,
    identityPageId: t.identityPageId,
  };
}

function AtMentionSuggestionPopover({ editor, state, targets, onClose }: {
  editor: Editor;
  state: AtSuggestionState;
  targets: AtTarget[];
  onClose: () => void;
}) {
  const matches = useMemo(() => filterMentionTargets(targets, state.query), [targets, state.query]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => setSelectedIndex(0), [state.query]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      else if (event.key === 'ArrowDown' && matches.length) { event.preventDefault(); setSelectedIndex((value) => (value + 1) % matches.length); }
      else if (event.key === 'ArrowUp' && matches.length) { event.preventDefault(); setSelectedIndex((value) => (value - 1 + matches.length) % matches.length); }
      else if (event.key === 'Enter' && matches[selectedIndex]) {
        event.preventDefault();
        insertSocialMention(editor.view, state, matches[selectedIndex]);
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [editor, matches, selectedIndex, state, onClose]);

  return createPortal(
    <div className="fixed z-[200] min-w-[200px] rounded-lg border border-border bg-background shadow-lg" style={{ top: state.top, left: state.left }} role="listbox" aria-label="Mention">
      <div className={`border-b border-border px-3 py-2 ${META_SECTION_LABEL_CLASS}`}>Mention</div>
      <ul className="max-h-48 overflow-y-auto py-1">
        {matches.map((target, index) => <li key={`${target.mentionType}-${target.label}`}>
          <button type="button" role="option" aria-selected={selectedIndex === index}
            className={`w-full px-3 py-1.5 text-left text-sm hover:bg-muted/30 ${selectedIndex === index ? 'bg-primary/10' : ''}`}
            onMouseEnter={() => setSelectedIndex(index)}
            onMouseDown={(event) => { event.preventDefault(); insertSocialMention(editor.view, state, target); onClose(); }}>
            @{target.label}<span className="ml-1 text-xs text-muted">{target.mentionType === 'character' ? 'character' : 'player'}</span>
          </button>
        </li>)}
      </ul>
    </div>,
    editor.view.dom.closest('dialog[open]') ?? document.body,
  );
}

export function useWikiEditorLoreExtensions(campaignHandle: string | undefined) {
  const adventure = useOptionalAdventureWorkspace();
  const previewAsPlayer = Boolean(adventure?.isDMUser && adventure.playerPreview);
  const wiki = useOptionalWiki();
  const { index } = useWikiLinkIndex(campaignHandle);
  const [bracketState, setBracketState] = useState<BracketSuggestionState | null>(null);
  const [slashState, setSlashState] = useState<SlashSuggestionState | null>(null);
  const [atState, setAtState] = useState<AtSuggestionState | null>(null);
  const [mentionTargets, setMentionTargets] = useState<AtTarget[]>([]);
  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const [sourceRequest, setSourceRequest] = useState<SourcePickerRequest | null>(null);
  const [sourceInteraction, setSourceInteraction] = useState<SourceInteraction | null>(null);

  useEffect(() => {
    if (!campaignHandle) {
      setMentionTargets([]);
      return;
    }
    fetchMentionTargets(campaignHandle, { previewAsPlayer })
      .then((rows) => setMentionTargets(rows.map(mapApiMentionTarget)))
      .catch(() => setMentionTargets([]));
  }, [campaignHandle, previewAsPlayer]);

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

  const BracketPopover = useCallback(
    ({ editor }: { editor: Editor | null }) => {
      if (!bracketState || !editor) return null;
      return (
        <WikiBracketSuggestionPopover
          portalContainer={editor.view.dom.closest('dialog[open]') ?? undefined}
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
      return (
        <WikiSlashSuggestionPopover
          editor={editor}
          portalContainer={editor.view.dom.closest('dialog[open]') ?? undefined}
          state={slashState}
          onSource={() => {
            const selection = editor.state.selection;
            setSourceRequest({ editor, doc: editor.state.doc, range: { from: selection.from, to: selection.to } });
          }}
          onClose={() => setSlashState(null)}
        />
      );
    },
    [slashState],
  );

  const AtPopover = useCallback(
    ({ editor }: { editor: Editor | null }) => {
      if (!atState || !editor) return null;
      return <AtMentionSuggestionPopover editor={editor} state={atState} targets={mentionTargets} onClose={() => setAtState(null)} />;
    },
    [atState, mentionTargets],
  );

  const lorePopoverState = useRef({
    BracketPopover,
    SlashPopover,
    AtPopover,
    sourceRequest,
    sourceInteraction,
    campaignId: wiki?.campaign?.id,
  });
  lorePopoverState.current = {
    BracketPopover,
    SlashPopover,
    AtPopover,
    sourceRequest,
    sourceInteraction,
    campaignId: wiki?.campaign?.id,
  };

  const LorePopovers = useMemo(
    () => function LorePopoversStable({ editor }: { editor: Editor | null }) {
      useEffect(() => {
        const listener = (event: Event) => {
          const detail = (event as CustomEvent<{ editor: Editor }>).detail;
          if (editor && detail?.editor === editor) setSourceRequest({ editor, doc: editor.state.doc, range: { from: editor.state.selection.from, to: editor.state.selection.to } });
        };
        window.addEventListener(OPEN_SOURCE_PICKER_EVENT, listener);
        const providerListener = (event: Event) => {
          const detail = (event as CustomEvent<{ editor: Editor; provider: WikiProviderKind }>).detail;
          if (!editor || detail?.editor !== editor) return;
          const selection = editor.state.selection;
          const position = selection.from;
          const coords = editor.view.coordsAtPos(position);
          const insertionState = { active: true, query: '', from: position, to: position, top: coords.bottom + 4, left: coords.left };
          const replacementState = { ...insertionState, to: selection.to };
          setBracketState(detail.provider === 'references' ? replacementState : null);
          setSlashState(detail.provider === 'commands' ? insertionState : null);
          setAtState(detail.provider === 'mentions' ? replacementState : null);
          editor.commands.focus();
        };
        window.addEventListener(OPEN_WIKI_PROVIDER_EVENT, providerListener);
        const sourceListener = (event: Event) => {
          const detail = (event as CustomEvent<Omit<SourceInteraction, 'editor'> & { editorView: Editor['view'] }>).detail;
          if (editor && detail?.editorView === editor.view) setSourceInteraction({ ...detail, editor });
        };
        window.addEventListener(SOURCE_REFERENCE_INTERACT_EVENT, sourceListener);
        return () => { window.removeEventListener(OPEN_SOURCE_PICKER_EVENT, listener); window.removeEventListener(OPEN_WIKI_PROVIDER_EVENT, providerListener); window.removeEventListener(SOURCE_REFERENCE_INTERACT_EVENT, sourceListener); };
      }, [editor]);
      const current = lorePopoverState.current;
      const CurrentBracketPopover = current.BracketPopover;
      const CurrentSlashPopover = current.SlashPopover;
      const CurrentAtPopover = current.AtPopover;
      return <>
        <CurrentBracketPopover editor={editor} />
        <CurrentSlashPopover editor={editor} />
        <CurrentAtPopover editor={editor} />
        {current.sourceRequest && current.campaignId ? <SourcePicker campaignId={current.campaignId} request={current.sourceRequest} onClose={() => setSourceRequest(null)} /> : null}
        {current.sourceInteraction && current.campaignId ? <SourceReferencePopover campaignId={current.campaignId} interaction={current.sourceInteraction} onClose={() => setSourceInteraction(null)} /> : null}
      </>
    },
    [],
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
  if (!onAmbientToggle) return null;
  return (
    <div className="flex items-center justify-end border-b border-border px-3 py-1.5 text-[10px] text-muted">
      <label className="flex cursor-pointer items-center gap-1.5">
        <input
          type="checkbox"
          checked={ambientEnabled}
          onChange={(e) => onAmbientToggle(e.target.checked)}
        />
        Ambient hints
      </label>
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
