import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  LayoutGrid,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  Sparkles,
  Strikethrough,
  Underline,
  Eraser,
} from 'lucide-react';
import { useOptionalWiki } from '@/contexts/WikiContext';
import { campaignWikiPath, readCampaignHandle } from '@/lib/campaignPaths';
import { flattenWikiTree } from '@/lib/wiki';
import {
  documentScanMessage,
  scanDocumentWikiAutoLink,
} from '@/lib/wikiAutoLink';
import type { WikiTreeNode } from '@/types/wiki';
import {
  EditorColorPickerToolbarButton,
} from './EditorColorPickerContext';

interface WikiEditorToolbarProps {
  editor: Editor | null;
  /** Fallback wiki index when WikiProvider is unavailable. */
  wikiTree?: WikiTreeNode[];
}

function ToolbarButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors ${
        active
          ? 'bg-primary/20 text-primary'
          : 'text-muted hover:bg-elevated hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function MarkerDropdownTableMatrix({
  editor,
  max = 5,
}: {
  editor: Editor;
  max?: number;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<{ rows: number; cols: number } | null>(
    null,
  );

  const insert = (rows: number, cols: number) => {
    editor
      .chain()
      .focus()
      .insertTable({ rows, cols, withHeaderRow: true })
      .run();
  };

  return (
    <div className="relative">
      <ToolbarButton
        title="Insert Table"
        active={false}
        onClick={() => setOpen((v) => !v)}
      >
        <LayoutGrid className="size-4" />
      </ToolbarButton>

      {open && (
        <div className="absolute left-0 top-10 z-20 w-64 rounded-xl border border-border bg-background/95 p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between text-[11px] text-muted">
            <span>Table size</span>
            {hover ? (
              <span className="text-foreground">
                {hover.cols}×{hover.rows}
              </span>
            ) : (
              <span>max {max}×{max}</span>
            )}
          </div>

          <div className="grid grid-cols-6 gap-1">
            {/* Top headers */}
            <div />
            {Array.from({ length: max }).map((_, i) => (
              <div
                key={`col-${i + 1}`}
                className="text-center text-[10px] text-muted"
              >
                {i + 1}
              </div>
            ))}

            {Array.from({ length: max }).map((_, rIdx) => {
              const rows = rIdx + 1;
              return (
                <div key={`row-${rows}`} className="contents">
                  <div className="text-right pr-1 text-[10px] text-muted">
                    {rows}
                  </div>
                  {Array.from({ length: max }).map((_, cIdx) => {
                    const cols = cIdx + 1;
                    const active =
                      hover?.rows === rows && hover?.cols === cols;
                    return (
                      <button
                        key={`${rows}x${cols}`}
                        type="button"
                        onMouseEnter={() => setHover({ rows, cols })}
                        onClick={() => {
                          insert(rows, cols);
                          setOpen(false);
                          setHover(null);
                        }}
                        className={`h-7 w-full rounded-md border transition-colors ${
                          active
                            ? 'border-primary/60 bg-primary/20'
                            : 'border-border bg-surface/50 hover:bg-surface'
                        }`}
                        title={`${rows} row(s), ${cols} col(s)`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function WikiEditorToolbar({
  editor,
  wikiTree = [],
}: WikiEditorToolbarProps) {
  const params = useParams<{ campaignHandle?: string; campaignId?: string }>();
  const wiki = useOptionalWiki();
  const campaignHandle = readCampaignHandle(params) || wiki?.campaignHandle || '';
  const resolvePageId = wiki?.resolvePageId;

  const flatPages = useMemo(
    () => wiki?.flatPages ?? flattenWikiTree(wikiTree),
    [wiki?.flatPages, wikiTree],
  );

  if (!editor) return null;

  const handleAutoLink = () => {
    if (wiki?.loading) {
      window.alert('Wiki pages are still loading. Try again in a moment.');
      return;
    }
    const result = scanDocumentWikiAutoLink(editor, {
      campaignHandle,
      flatPages,
    });
    if (!result.ok) {
      window.alert(documentScanMessage(result));
    }
  };

  const setAlign = (align: 'left' | 'center' | 'right') => {
    editor.chain().focus().setTextAlign(align).run();
  };

  const handleInsertLink = () => {
    const raw = window.prompt(
      'Insert Link: paste a wiki page title or a URL',
    );
    if (!raw) return;
    const input = raw.trim();
    if (!input) return;

    const maybePageId = resolvePageId?.(input);
    const href = maybePageId && campaignHandle
      ? campaignWikiPath(campaignHandle, maybePageId, flatPages)
      : input;

    editor.chain().focus().setLink({ href }).run();
  };

  const handleInsertToc = () => {
    editor.chain().focus().insertContent({ type: 'toc' }).run();
  };

  return (
    <div className="flex max-w-full flex-nowrap items-center gap-0.5 overflow-x-auto border-b border-border bg-surface/80 px-2 py-1.5">
      {/* Unlabeled block-style actions */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="Header 1"
      >
        <Heading1 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Header 2"
      >
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Header 3"
      >
        <Heading3 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="Quote"
      >
        <Quote className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive('codeBlock')}
        title="Code Block"
      >
        <Code className="size-4" />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-elevated" />

      <ToolbarButton
        onClick={() => editor.chain().focus().unsetAllMarks().run()}
        active={false}
        title="Clear formatting"
      >
        <Eraser className="size-4" />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-elevated" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold"
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic"
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Underline"
      >
        <Underline className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="size-4" />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-elevated" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Bullet list"
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Ordered list"
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-elevated" />

      {/* Text alignment */}
      <ToolbarButton
        onClick={() => setAlign('left')}
        active={editor.isActive({ textAlign: 'left' })}
        title="Align left"
      >
        <AlignLeft className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => setAlign('center')}
        active={editor.isActive({ textAlign: 'center' })}
        title="Align center"
      >
        <AlignCenter className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => setAlign('right')}
        active={editor.isActive({ textAlign: 'right' })}
        title="Align right"
      >
        <AlignRight className="size-4" />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-elevated" />

      {/* Divider / HR */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divider"
        active={false}
      >
        <Minus className="size-4" />
      </ToolbarButton>

      {/* Insert Link */}
      <ToolbarButton
        onClick={handleInsertLink}
        title="Insert Link"
        active={false}
      >
        <Link className="size-4" />
      </ToolbarButton>

      {/* Table of Contents */}
      <ToolbarButton onClick={handleInsertToc} title="Table of Contents">
        <ListOrdered className="size-4" />
      </ToolbarButton>

      {/* Insert Table (matrix dropdown) */}
      <MarkerDropdownTableMatrix editor={editor} />

      {/* Auto-link */}
      <button
        type="button"
        onClick={handleAutoLink}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/20 px-2 py-1.5 text-xs font-medium text-primary/90 hover:bg-primary/10"
        title="Auto-Link: link selection to a wiki page"
      >
        <Link className="size-3.5" />
        <span className="hidden sm:inline">Auto-Link</span>
      </button>

      <span className="mx-1 h-5 w-px bg-elevated" />

      <EditorColorPickerToolbarButton kind="text" />
      <EditorColorPickerToolbarButton kind="highlight" />

      <span className="ml-auto hidden text-xs text-muted sm:inline-flex items-center gap-1">
        <Sparkles className="size-3" />
        Markdown supported
      </span>
    </div>
  );
}
