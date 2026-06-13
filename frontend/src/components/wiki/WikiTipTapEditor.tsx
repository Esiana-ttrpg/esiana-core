import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { WikiEditorToolbar } from './WikiEditorToolbar';
import {
  EditorColorPickerPanel,
  EditorColorPickerProvider,
} from './EditorColorPickerContext';
import {
  buildWikiEditorUseEditorConfig,
  getWikiEditorMarkdown,
} from './createWikiEditor';
import {
  CodexLinkBridgeChips,
  useCodexLinkBridge,
  useWikiEditorLoreExtensions,
  WikiSyntaxHint,
} from './WikiEditorLoreShell';
import { useOptionalWiki } from '@/contexts/WikiContext';
import { useEditorInstrumentation } from '@/hooks/useEditorInstrumentation';
import { EditorInstrumentationStrip } from './EditorInstrumentationStrip';
import type { WikiTreeNode } from '@/types/wiki';

interface WikiTipTapEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  wikiTree: WikiTreeNode[];
  minHeight?: string;
  /** When set, enables lightweight session instrumentation. */
  instrumentationPageId?: string;
  instrumentationPageTitle?: string;
  enableInstrumentation?: boolean;
}

export function WikiTipTapEditor({
  content,
  onChange,
  placeholder: _placeholder = 'Write in Markdown…',
  wikiTree,
  minHeight = 'min-h-[200px]',
  instrumentationPageId,
  instrumentationPageTitle,
  enableInstrumentation = true,
}: WikiTipTapEditorProps) {
  const lastEmittedMarkdown = useRef(content || '');
  const wikiCtx = useOptionalWiki();
  const campaignHandle = wikiCtx?.campaignHandle ?? '';
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
      content: content || '',
      minHeight,
      onUpdate: (markdown) => {
        lastEmittedMarkdown.current = markdown;
        onChange(markdown);
      },
    }),
  });

  useEffect(() => {
    if (!editor) return;
    if (content === lastEmittedMarkdown.current) return;
    const current = getWikiEditorMarkdown(editor);
    if (content !== current) {
      editor.commands.setContent(content || '', { contentType: 'markdown' });
      lastEmittedMarkdown.current = content || '';
    }
  }, [content, editor]);

  const instrumentation = useEditorInstrumentation(editor, {
    enabled: enableInstrumentation && Boolean(campaignHandle && instrumentationPageId),
    campaignHandle,
    pageId: instrumentationPageId,
    pageTitle: instrumentationPageTitle,
  });

  const bridgeLabels = useCodexLinkBridge(editor, content, resolveEntryByLabel);

  return (
    <EditorColorPickerProvider editor={editor}>
      <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-background/60">
        <WikiEditorToolbar editor={editor} wikiTree={wikiTree} />
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
        <div className="relative min-w-0 overflow-x-auto">
          <EditorContent editor={editor} />
          <LorePopovers editor={editor} />
        </div>
        {enableInstrumentation && instrumentationPageId ? (
          <EditorInstrumentationStrip instrumentation={instrumentation} />
        ) : null}
      </div>
    </EditorColorPickerProvider>
  );
}
