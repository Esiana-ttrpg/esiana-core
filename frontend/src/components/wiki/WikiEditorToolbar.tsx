import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Editor } from '@tiptap/react';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, CheckSquare, ChevronDown, Code,
  Eraser, Highlighter, Italic, Link, List, ListOrdered, Minus,
  PenLine, Quote, Strikethrough, Underline,
} from 'lucide-react';
import { useOptionalWiki } from '@/contexts/WikiContext';
import { campaignWikiPath, campaignWorkshopPath, readCampaignHandle } from '@/lib/campaignPaths';
import { isWorkshopEligiblePage } from '@/lib/authoringEligibility';
import { flattenWikiTree } from '@/lib/wiki';
import { documentScanMessage, scanDocumentWikiAutoLink } from '@/lib/wikiAutoLink';
import type { WikiTreeNode } from '@/types/wiki';
import { EditorColorPickerToolbarButton } from './EditorColorPickerContext';
import { AdmonitionToolbarDropdown } from './AdmonitionToolbarDropdown';
import { OPEN_SOURCE_PICKER_EVENT } from './SourcePicker';
import { OPEN_WIKI_PROVIDER_EVENT, type WikiProviderKind } from './WikiEditorLoreShell';

interface WikiEditorToolbarProps {
  editor: Editor | null;
  wikiTree?: WikiTreeNode[];
  workshopFromPageId?: string;
  pageCanEdit?: boolean;
  templateType?: string;
  confirmWorkshopLeave?: boolean;
}
function ToolbarButton({ children, onClick, active, title, className = '' }: {
  children: React.ReactNode; onClick: () => void; active?: boolean; title: string; className?: string;
}) {
  return <button type="button" title={title} aria-label={title} onMouseDown={(event) => event.preventDefault()} onClick={onClick}
    className={`shrink-0 rounded-md p-1.5 transition-colors ${active ? 'bg-primary/20 text-primary' : 'text-muted hover:bg-elevated hover:text-foreground'} ${className}`}>
    {children}
  </button>;
}

function LabeledButton({ label, title, onClick, className = '', ariaExpanded, ariaHaspopup }: { label: React.ReactNode; title: string; onClick: () => void; className?: string; ariaExpanded?: boolean; ariaHaspopup?: 'menu' }) {
  return <button type="button" title={title} onMouseDown={(event) => event.preventDefault()} onClick={onClick}
    aria-expanded={ariaExpanded} aria-haspopup={ariaHaspopup}
    className={`shrink-0 rounded-md border border-border/60 px-2 py-1 text-xs font-medium text-muted hover:bg-elevated hover:text-foreground ${className}`}>
    {label}
  </button>;
}

function MenuAction({ children, onClick, className = '' }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return <button type="button" className={`w-full rounded-md px-2 py-1.5 text-left text-xs text-muted hover:bg-elevated hover:text-foreground ${className}`}
    data-menu-action onMouseDown={(event) => event.preventDefault()} onClick={onClick}>{children}</button>;
}

function openProvider(editor: Editor, provider: WikiProviderKind) {
  window.dispatchEvent(new CustomEvent(OPEN_WIKI_PROVIDER_EVENT, { detail: { editor, provider } }));
}

function activeNodePosition(editor: Editor, name: string): number | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === name) return $from.before(depth);
  }
  return null;
}

function ContextualToolbar({ editor, campaignHandle, flatPages }: { editor: Editor; campaignHandle: string; flatPages: ReturnType<typeof flattenWikiTree> }) {
  const [, refresh] = useReducer((value) => value + 1, 0);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const update = () => refresh();
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => { editor.off('selectionUpdate', update); editor.off('transaction', update); };
  }, [editor]);

  const context = editor.isActive('table') ? 'Table'
    : editor.isActive('link') ? 'Link'
      : editor.isActive('wikiLink') ? 'Reference'
        : editor.isActive('taskItem') ? 'Task item'
          : editor.isActive('details') ? 'Details'
            : null;
  if (!context) return null;

  const actions: Array<{ label: string; run: () => void }> = [];
  if (context === 'Table') actions.push(
    { label: 'Add row', run: () => { editor.chain().focus().addRowAfter().run(); } },
    { label: 'Remove row', run: () => { editor.chain().focus().deleteRow().run(); } },
    { label: 'Add column', run: () => { editor.chain().focus().addColumnAfter().run(); } },
    { label: 'Remove column', run: () => { editor.chain().focus().deleteColumn().run(); } },
    { label: 'Toggle header cell', run: () => { editor.chain().focus().toggleHeaderCell().run(); } },
    { label: 'Delete table', run: () => { editor.chain().focus().deleteTable().run(); } },
  );
  if (context === 'Details') actions.push(
    { label: 'Expand / collapse', run: () => {
      const pos = activeNodePosition(editor, 'details');
      const dom = pos === null ? null : editor.view.nodeDOM(pos);
      (dom instanceof HTMLElement ? dom.querySelector(':scope > button') : null)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    } },
    { label: 'Edit summary', run: () => {
      const pos = activeNodePosition(editor, 'details');
      if (pos !== null) editor.chain().focus().setTextSelection(pos + 2).run();
    } },
    { label: 'Remove container', run: () => { editor.chain().focus().unsetDetails().run(); } },
  );
  if (context === 'Task item') actions.push(
    { label: 'Indent', run: () => { editor.chain().focus().sinkListItem('taskItem').run(); } },
    { label: 'Outdent', run: () => { editor.chain().focus().liftListItem('taskItem').run(); } },
    { label: 'Toggle completion', run: () => {
      const checked = Boolean(editor.getAttributes('taskItem').checked);
      editor.chain().focus().updateAttributes('taskItem', { checked: !checked }).run();
    } },
  );
  if (context === 'Link') {
    const href = String(editor.getAttributes('link').href ?? '');
    actions.push(
      { label: 'Open', run: () => { if (href) window.open(href, '_blank', 'noopener,noreferrer'); } },
      { label: 'Edit', run: () => { const next = window.prompt('Edit link', href); if (next?.trim()) editor.chain().focus().extendMarkRange('link').setLink({ href: next.trim() }).run(); } },
      { label: 'Remove', run: () => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); } },
    );
  }
  if (context === 'Reference') {
    const attrs = editor.getAttributes('wikiLink');
    actions.push(
      { label: 'Open', run: () => { if (attrs.targetPageId && campaignHandle) window.open(campaignWikiPath(campaignHandle, attrs.targetPageId, flatPages), '_blank', 'noopener,noreferrer'); } },
      { label: 'Retarget', run: () => openProvider(editor, 'references') },
      { label: 'Remove', run: () => { editor.chain().focus().deleteSelection().run(); } },
    );
  }

  return <div className="relative flex min-w-0 items-center gap-1 border-b border-border bg-background/60 px-2 py-1">
    <span className="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted">{context}</span>
    <div className="hidden min-w-0 flex-wrap gap-1 sm:flex">{actions.map((action) => <LabeledButton key={action.label} label={action.label} title={`${context}: ${action.label}`} onClick={action.run} />)}</div>
    <div className="sm:hidden">
      <LabeledButton label="Actions" title={`${context} actions`} onClick={() => setMobileOpen((open) => !open)} />
      {mobileOpen ? <div className="absolute left-2 top-full z-30 mt-1 w-48 rounded-lg border border-border bg-background p-1 shadow-xl">
        {actions.map((action) => <MenuAction key={action.label} onClick={() => { action.run(); setMobileOpen(false); }}>{action.label}</MenuAction>)}
      </div> : null}
    </div>
  </div>;
}

export function WikiEditorToolbar({ editor, wikiTree = [], workshopFromPageId, pageCanEdit = true, templateType = '', confirmWorkshopLeave = false }: WikiEditorToolbarProps) {
  const params = useParams<{ campaignHandle?: string; campaignId?: string }>();
  const navigate = useNavigate();
  const wiki = useOptionalWiki();
  const campaignHandle = readCampaignHandle(params) || wiki?.campaignHandle || '';
  const resolvePageId = wiki?.resolvePageId;
  const flatPages = useMemo(() => wiki?.flatPages ?? flattenWikiTree(wikiTree), [wiki?.flatPages, wikiTree]);
  const [paragraphOpen, setParagraphOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const paragraphMenuRef = useRef<HTMLDivElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!paragraphOpen && !moreOpen) return;
    const dismissOnPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (target instanceof Element && target.closest('[data-editor-color-picker], [data-toolbar-nested-menu]')) return;
      if (paragraphOpen && !paragraphMenuRef.current?.contains(target)) setParagraphOpen(false);
      if (moreOpen && !moreMenuRef.current?.contains(target)) setMoreOpen(false);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setParagraphOpen(false);
      setMoreOpen(false);
    };
    document.addEventListener('mousedown', dismissOnPointerDown);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('mousedown', dismissOnPointerDown);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [moreOpen, paragraphOpen]);

  if (!editor) return null;

  const link = () => {
    const raw = window.prompt('Insert Link: paste a wiki page title or a URL');
    if (!raw?.trim()) return;
    const maybePageId = resolvePageId?.(raw.trim());
    const href = maybePageId && campaignHandle ? campaignWikiPath(campaignHandle, maybePageId, flatPages) : raw.trim();
    editor.chain().focus().setLink({ href }).run();
  };
  const autoLink = () => {
    if (wiki?.loading) return window.alert('Wiki pages are still loading. Try again in a moment.');
    const result = scanDocumentWikiAutoLink(editor, { campaignHandle, flatPages });
    if (!result.ok) window.alert(documentScanMessage(result));
  };
  const canOpenWorkshop = Boolean(workshopFromPageId) && isWorkshopEligiblePage(pageCanEdit, templateType);
  const workshop = () => {
    if (!campaignHandle || !workshopFromPageId) return;
    if (confirmWorkshopLeave && !window.confirm('You have unsaved page changes. Open Workshop anyway?')) return;
    navigate(campaignWorkshopPath(campaignHandle, { fromPageId: workshopFromPageId }));
  };

  return <div>
    <div className="relative flex min-w-0 max-w-full items-center gap-0.5 overflow-visible border-b border-border bg-surface/80 px-2 py-1.5">
      <div ref={paragraphMenuRef} className="relative shrink-0">
        <LabeledButton label={<><span className="hidden min-[360px]:inline">Paragraph</span><span className="min-[360px]:hidden">¶</span></>} title="Paragraph styles" ariaExpanded={paragraphOpen} ariaHaspopup="menu" onClick={() => setParagraphOpen((open) => !open)} />
        {paragraphOpen ? <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-lg border border-border bg-background p-1 shadow-xl">
          <MenuAction onClick={() => { editor.chain().focus().setParagraph().run(); setParagraphOpen(false); }}>Paragraph</MenuAction>
          {[1, 2, 3].map((level) => <MenuAction key={level} onClick={() => { editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run(); setParagraphOpen(false); }}>Heading {level}</MenuAction>)}
          <MenuAction onClick={() => { editor.chain().focus().toggleBlockquote().run(); setParagraphOpen(false); }}><span className="inline-flex items-center gap-2"><Quote className="size-3.5" />Quote</span></MenuAction>
          <MenuAction onClick={() => { editor.chain().focus().toggleCodeBlock().run(); setParagraphOpen(false); }}><span className="inline-flex items-center gap-2"><Code className="size-3.5" />Code block</span></MenuAction>
        </div> : null}
      </div>

      <LabeledButton label={<><span className="hidden min-[360px]:inline">/ Commands</span><span className="min-[360px]:hidden">/</span></>} title="Open command menu" onClick={() => openProvider(editor, 'commands')} />
      <LabeledButton label="[[ References" title="Open wiki reference picker" onClick={() => openProvider(editor, 'references')} className="hidden md:block" />
      <LabeledButton label="@ Mentions" title="Open member and character picker" onClick={() => openProvider(editor, 'mentions')} className="hidden lg:block" />
      <span className="mx-1 hidden h-5 w-px shrink-0 bg-elevated sm:block" />
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="size-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="size-4" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><Underline className="size-4" /></ToolbarButton>
      <ToolbarButton className="hidden sm:block" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List className="size-4" /></ToolbarButton>
      <ToolbarButton className="hidden sm:block" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list"><ListOrdered className="size-4" /></ToolbarButton>
      <ToolbarButton className="hidden lg:block" onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Checklist"><CheckSquare className="size-4" /></ToolbarButton>
      <ToolbarButton className="hidden md:block" onClick={link} active={editor.isActive('link')} title="Link"><Link className="size-4" /></ToolbarButton>
      <div className="hidden xl:block"><EditorColorPickerToolbarButton kind="highlight" /></div>

      <div ref={moreMenuRef} className="relative ml-auto shrink-0">
        <LabeledButton label="More" title="More editor actions" ariaExpanded={moreOpen} ariaHaspopup="menu" onClick={() => setMoreOpen((open) => !open)} />
        {moreOpen ? <div className="absolute right-0 top-full z-40 mt-1 max-h-[70vh] w-56 overflow-y-auto rounded-xl border border-border bg-background p-1.5 shadow-xl"
          onClick={(event) => { if ((event.target as Element).closest('[data-menu-action]')) setMoreOpen(false); }}>
          <MenuAction className="md:hidden" onClick={() => openProvider(editor, 'references')}>[[ References</MenuAction>
          <MenuAction className="lg:hidden" onClick={() => openProvider(editor, 'mentions')}>@ Mentions</MenuAction>
          <MenuAction className="sm:hidden" onClick={() => editor.chain().focus().toggleBulletList().run()}>Bullet list</MenuAction>
          <MenuAction className="sm:hidden" onClick={() => editor.chain().focus().toggleOrderedList().run()}>Numbered list</MenuAction>
          <MenuAction className="lg:hidden" onClick={() => editor.chain().focus().toggleTaskList().run()}>Checklist</MenuAction>
          <MenuAction className="md:hidden" onClick={link}>Link</MenuAction>
          <MenuAction onClick={() => editor.chain().focus().setDetails().run()}>Collapsible details</MenuAction>
          <MenuAction onClick={() => editor.chain().focus().toggleStrike().run()}><span className="inline-flex items-center gap-2"><Strikethrough className="size-3.5" />Strikethrough</span></MenuAction>
          <MenuAction onClick={() => editor.chain().focus().unsetAllMarks().run()}><span className="inline-flex items-center gap-2"><Eraser className="size-3.5" />Clear formatting</span></MenuAction>
          <div className="my-1 border-t border-border" />
          <MenuAction onClick={() => editor.chain().focus().setTextAlign('left').run()}><span className="inline-flex items-center gap-2"><AlignLeft className="size-3.5" />Align left</span></MenuAction>
          <MenuAction onClick={() => editor.chain().focus().setTextAlign('center').run()}><span className="inline-flex items-center gap-2"><AlignCenter className="size-3.5" />Align center</span></MenuAction>
          <MenuAction onClick={() => editor.chain().focus().setTextAlign('right').run()}><span className="inline-flex items-center gap-2"><AlignRight className="size-3.5" />Align right</span></MenuAction>
          <MenuAction onClick={() => editor.chain().focus().setHorizontalRule().run()}><span className="inline-flex items-center gap-2"><Minus className="size-3.5" />Divider</span></MenuAction>
          <MenuAction onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Insert table</MenuAction>
          <MenuAction onClick={() => editor.chain().focus().insertContent({ type: 'toc' }).run()}>Table of contents</MenuAction>
          <MenuAction onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SOURCE_PICKER_EVENT, { detail: { editor } }))}>Source citation</MenuAction>
          <MenuAction onClick={autoLink}>Auto-Link</MenuAction>
          <div className="flex items-center gap-1 px-1 py-1"><EditorColorPickerToolbarButton kind="text" /><span className="xl:hidden"><EditorColorPickerToolbarButton kind="highlight" /></span><Highlighter className="ml-auto size-3.5 text-muted" /></div>
          <div className="px-1 py-1"><AdmonitionToolbarDropdown editor={editor} /></div>
          {canOpenWorkshop ? <MenuAction onClick={workshop}><span className="inline-flex items-center gap-2"><PenLine className="size-3.5" />Workshop</span></MenuAction> : null}
        </div> : null}
      </div>
    </div>
    <ContextualToolbar editor={editor} campaignHandle={campaignHandle} flatPages={flatPages} />
  </div>;
}
