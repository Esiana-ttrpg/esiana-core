import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { EditorContent, useEditor } from '@tiptap/react';
import { useOptionalWiki } from '@/contexts/WikiContext';
import { useWikiLinkIntegrity } from '../hooks/useWikiLinkIntegrity';
import { WikiEditorToolbar } from '../WikiEditorToolbar';
import {
  EditorColorPickerPanel,
  EditorColorPickerProvider,
} from '../EditorColorPickerContext';
import {
  buildWikiEditorUseEditorConfig,
  getWikiEditorMarkdown,
  WIKI_EDITOR_PROSE_CLASS,
} from '../createWikiEditor';
import {
  CodexLinkBridgeChips,
  useCodexLinkBridge,
  useWikiEditorLoreExtensions,
  WikiSyntaxHint,
} from '../WikiEditorLoreShell';
import { useEditorInstrumentation } from '@/hooks/useEditorInstrumentation';
import { EditorInstrumentationStrip } from '../EditorInstrumentationStrip';

interface TiptapWidgetProps {
  content: Record<string, unknown>;
  onChange: (newContent: Record<string, unknown>) => void;
  isEditingLayout: boolean;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}

const WIKI_HREF_PAGE_ID =
  /\/(?:c|campaign)\/[A-Za-z0-9_-]+\/(?:wiki\/([A-Za-z0-9_-]+)|event-([A-Za-z0-9_-]+))/;

function applyBrokenLinkMarkers(
  root: HTMLElement,
  brokenTargetIds: Set<string>,
): void {
  root.querySelectorAll('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href') ?? '';
    const match = WIKI_HREF_PAGE_ID.exec(href);
    const targetId = match?.[1] ?? (match?.[2] ? `event-${match[2]}` : '');
    const isBroken = targetId && brokenTargetIds.has(targetId);
    anchor.classList.toggle('wiki-link--broken', Boolean(isBroken));
    if (isBroken) {
      anchor.setAttribute('title', 'Broken internal link — target page not found');
    } else {
      anchor.removeAttribute('title');
    }
  });

  root
    .querySelectorAll(
      '[data-type="mention"][data-stub="true"], [data-type="wikiLink"][data-stub="true"]',
    )
    .forEach((node) => {
      node.classList.add('wiki-link--broken');
      node.setAttribute('title', 'Unresolved — tap to link or create');
    });
}

export function TiptapWidget({
  content,
  onChange,
  isEditingLayout,
  onInteractionStart,
  onInteractionEnd,
}: TiptapWidgetProps) {
  const params = useParams<{
    campaignHandle?: string;
    pageId?: string;
    characterId?: string;
  }>();
  const wiki = useOptionalWiki();
  const campaignHandle = wiki?.campaignHandle ?? params.campaignHandle ?? '';
  const pageId = params.pageId ?? params.characterId ?? '';
  const pageTitle = wiki?.flatPages?.find((p) => p.id === pageId)?.title;
  const { brokenTargetIds, integrity } = useWikiLinkIntegrity(
    campaignHandle,
    pageId,
    Boolean(campaignHandle && pageId),
  );

  const initialMarkdown =
    typeof content.markdown === 'string' ? content.markdown : '';
  const lastEmittedMarkdown = useRef(initialMarkdown);
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
      content: initialMarkdown,
      editable: isEditingLayout,
      proseClass: WIKI_EDITOR_PROSE_CLASS,
      onUpdate: (markdown) => {
        if (!isEditingLayout) return;
        lastEmittedMarkdown.current = markdown;
        onChange({ markdown });
      },
    }),
  });

  const instrumentation = useEditorInstrumentation(editor, {
    enabled: isEditingLayout && Boolean(campaignHandle && pageId),
    campaignHandle,
    pageId,
    pageTitle,
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(isEditingLayout);
  }, [editor, isEditingLayout]);

  useEffect(() => {
    if (!editor) return;
    if (initialMarkdown === lastEmittedMarkdown.current) return;
    const current = getWikiEditorMarkdown(editor);
    if (initialMarkdown !== current) {
      editor.commands.setContent(initialMarkdown, { contentType: 'markdown' });
      lastEmittedMarkdown.current = initialMarkdown;
    }
  }, [editor, initialMarkdown]);

  useEffect(() => {
    if (!editor || !isEditingLayout) return;

    const handleFocus = () => {
      onInteractionStart?.();
    };
    const handleBlur = () => {
      onInteractionEnd?.();
    };

    editor.on('focus', handleFocus);
    editor.on('blur', handleBlur);
    return () => {
      editor.off('focus', handleFocus);
      editor.off('blur', handleBlur);
    };
  }, [editor, isEditingLayout, onInteractionStart, onInteractionEnd]);

  useEffect(() => {
    if (!editor) return;
    const root = editor.view.dom as HTMLElement;
    applyBrokenLinkMarkers(root, brokenTargetIds);
  }, [editor, brokenTargetIds, integrity, initialMarkdown, isEditingLayout]);

  const bridgeLabels = useCodexLinkBridge(
    editor,
    initialMarkdown,
    resolveEntryByLabel,
  );

  if (!isEditingLayout) {
    return (
      <div className="wiki-readonly-prose w-full min-w-0">
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <EditorColorPickerProvider editor={editor}>
      <div className="flex w-full min-w-0 flex-col rounded-lg border border-border bg-background/60">
        <div className="shrink-0">
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
      </div>

      <div className="wiki-widget-editor w-full min-w-0">
        <EditorContent editor={editor} />
        <LorePopovers editor={editor} />
      </div>
      {pageId ? <EditorInstrumentationStrip instrumentation={instrumentation} /> : null}
      </div>
    </EditorColorPickerProvider>
  );
}
