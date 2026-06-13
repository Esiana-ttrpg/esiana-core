import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { WorkshopDocument } from '@shared/workshopDocument';
import {
  buildWikiEditorUseEditorConfig,
  getWikiEditorMarkdown,
  WIKI_EDITOR_PROSE_CLASS,
} from '@/components/wiki/createWikiEditor';
import {
  CodexLinkBridgeChips,
  useCodexLinkBridge,
  useWikiEditorLoreExtensions,
  WikiSyntaxHint,
} from '@/components/wiki/WikiEditorLoreShell';
import { WikiEditorToolbar } from '@/components/wiki/WikiEditorToolbar';
import {
  EditorColorPickerPanel,
  EditorColorPickerProvider,
} from '@/components/wiki/EditorColorPickerContext';
import {
  useEditorInstrumentation,
  type EditorInstrumentationState,
} from '@/hooks/useEditorInstrumentation';
import { patchWorkshopDraft } from '@/lib/workshopDrafts';

interface WorkshopDocumentEditorProps {
  campaignHandle: string;
  draft: WorkshopDocument;
  onDraftUpdated: (draft: WorkshopDocument) => void;
  onInstrumentationChange?: (state: EditorInstrumentationState) => void;
}

export function WorkshopDocumentEditor({
  campaignHandle,
  draft,
  onDraftUpdated,
  onInstrumentationChange,
}: WorkshopDocumentEditorProps) {
  const lastEmitted = useRef(draft.bodyMarkdown);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [bodyMarkdown, setBodyMarkdown] = useState(draft.bodyMarkdown || '');

  const {
    loreExtensions,
    LorePopovers,
    resolveEntryByLabel,
    ambientEnabled,
    setAmbientEnabled,
  } = useWikiEditorLoreExtensions(campaignHandle);

  const editor = useEditor({
    ...buildWikiEditorUseEditorConfig({
      loreExtensions,
      content: draft.bodyMarkdown || '',
      minHeight: 'min-h-[60vh]',
      onUpdate: (markdown) => {
        lastEmitted.current = markdown;
        setBodyMarkdown(markdown);
        scheduleSave(markdown);
      },
    }),
  });

  const scheduleSave = useCallback(
    (markdown: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveState('saving');
      saveTimer.current = setTimeout(() => {
        void patchWorkshopDraft(campaignHandle, draft.id, { bodyMarkdown: markdown })
          .then((updated) => {
            onDraftUpdated(updated);
            setSaveState('saved');
          })
          .catch(() => setSaveState('idle'));
      }, 800);
    },
    [campaignHandle, draft.id, onDraftUpdated],
  );

  useEffect(() => {
    if (!editor) return;
    if (draft.bodyMarkdown === lastEmitted.current) return;
    const current = getWikiEditorMarkdown(editor);
    if (draft.bodyMarkdown !== current) {
      editor.commands.setContent(draft.bodyMarkdown || '', { contentType: 'markdown' });
      lastEmitted.current = draft.bodyMarkdown;
      setBodyMarkdown(draft.bodyMarkdown || '');
    }
  }, [draft.bodyMarkdown, draft.id, editor]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const instrumentation = useEditorInstrumentation(editor, {
    enabled: true,
    campaignHandle,
    pageId: draft.id,
    pageTitle: draft.title,
  });

  useEffect(() => {
    onInstrumentationChange?.(instrumentation);
  }, [instrumentation, onInstrumentationChange]);

  const bridgeLabels = useCodexLinkBridge(editor, bodyMarkdown, resolveEntryByLabel);

  return (
    <EditorColorPickerProvider editor={editor}>
      <div className="workshop-document-editor space-y-2">
        <WikiEditorToolbar editor={editor} />
        <EditorColorPickerPanel />
        <WikiSyntaxHint
        ambientEnabled={ambientEnabled}
        onAmbientToggle={setAmbientEnabled}
      />
      <CodexLinkBridgeChips
        editor={editor}
        labels={bridgeLabels}
        resolveEntryByLabel={resolveEntryByLabel}
      />
      <div
        className={`rounded-lg border border-border/40 bg-background/50 px-4 py-6 ${WIKI_EDITOR_PROSE_CLASS}`}
      >
        <EditorContent editor={editor} />
        <LorePopovers editor={editor} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}
      </p>
      </div>
    </EditorColorPickerProvider>
  );
}
