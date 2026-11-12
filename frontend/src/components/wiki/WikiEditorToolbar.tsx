import { useEffect, useMemo, useReducer, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Editor } from '@tiptap/react';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, BookOpen, CheckSquare, Code,
  Eraser, Italic, LayoutGrid, Link, List, ListOrdered, ListTree,
  Minus, PanelTopClose, PenLine, Quote, Sparkles, Strikethrough, Underline,
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

function ToolbarGroup({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <div role="group" aria-label={label} className={`wiki-toolbar-group items-center gap-0.5 ${className}`}>{children}</div>;
}

function MenuHeading({ children }: { children: React.ReactNode }) {
  return <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted/75">{children}</div>;
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

  useEffect(() => {
    if (!paragraphOpen && !moreOpen) return;
    const dismissOnPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (target instanceof Element && target.closest('[data-editor-color-picker], [data-toolbar-nested-menu]')) return;
      if (!(target instanceof Element) || !target.closest('[data-toolbar-popover-root]')) {
        setParagraphOpen(false);
        setMoreOpen(false);
      }
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

  const citeSource = () => window.dispatchEvent(new CustomEvent(OPEN_SOURCE_PICKER_EVENT, { detail: { editor } }));
  const insertTable = () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  const insertToc = () => editor.chain().focus().insertContent({ type: 'toc' }).run();
  const insertDetails = () => editor.chain().focus().setDetails().run();
  const closeMoreAfter = (action: () => void) => () => { action(); setMoreOpen(false); };

  const paragraphControl = (
    <div data-toolbar-popover-root className="relative shrink-0">
      <LabeledButton label={<><span className="hidden min-[360px]:inline">Paragraph</span><span className="min-[360px]:hidden">¶</span></>} title="Paragraph styles" ariaExpanded={paragraphOpen} ariaHaspopup="menu" onClick={() => setParagraphOpen((open) => !open)} />
      {paragraphOpen ? <div role="menu" className="absolute left-0 top-full z-40 mt-1 w-44 rounded-lg border border-border bg-background p-1 shadow-xl">
        <MenuAction onClick={() => { editor.chain().focus().setParagraph().run(); setParagraphOpen(false); }}>Paragraph</MenuAction>
        {[1, 2, 3].map((level) => <MenuAction key={level} onClick={() => { editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run(); setParagraphOpen(false); }}>Heading {level}</MenuAction>)}
        <MenuAction onClick={() => { editor.chain().focus().toggleBlockquote().run(); setParagraphOpen(false); }}><span className="inline-flex items-center gap-2"><Quote className="size-3.5" />Quote</span></MenuAction>
        <MenuAction onClick={() => { editor.chain().focus().toggleCodeBlock().run(); setParagraphOpen(false); }}><span className="inline-flex items-center gap-2"><Code className="size-3.5" />Code block</span></MenuAction>
      </div> : null}
    </div>
  );

  const overflowMenu = (
    <div data-toolbar-popover-root className="relative ml-auto shrink-0">
      <LabeledButton label="More" title="More editor actions" ariaExpanded={moreOpen} ariaHaspopup="menu" onClick={() => setMoreOpen((open) => !open)} />
      {moreOpen ? <div role="menu" className="absolute right-0 top-full z-40 mt-1 max-h-[70vh] w-60 overflow-y-auto rounded-xl border border-border bg-background p-1.5 shadow-xl">
        <div className="wiki-toolbar-mobile-only">
          <MenuHeading>Formatting</MenuHeading>
          <MenuAction onClick={closeMoreAfter(() => editor.chain().focus().toggleStrike().run())}>Strikethrough</MenuAction>
          <MenuAction onClick={closeMoreAfter(() => editor.chain().focus().toggleBulletList().run())}>Bullet list</MenuAction>
          <MenuAction onClick={closeMoreAfter(() => editor.chain().focus().toggleOrderedList().run())}>Numbered list</MenuAction>
          <MenuAction onClick={closeMoreAfter(() => editor.chain().focus().toggleTaskList().run())}>Checklist</MenuAction>
          <MenuAction onClick={closeMoreAfter(link)}>Link</MenuAction>
        </div>
        <MenuHeading>Formatting and alignment</MenuHeading>
        <div className="flex items-center gap-1 px-2 py-1"><EditorColorPickerToolbarButton kind="text" /><EditorColorPickerToolbarButton kind="highlight" /><span className="ml-1 text-xs text-muted">Color and highlight</span></div>
        <MenuAction onClick={closeMoreAfter(() => editor.chain().focus().unsetAllMarks().run())}>Clear formatting</MenuAction>
        <MenuAction onClick={closeMoreAfter(() => editor.chain().focus().setTextAlign('left').run())}>Align left</MenuAction>
        <MenuAction onClick={closeMoreAfter(() => editor.chain().focus().setTextAlign('center').run())}>Align center</MenuAction>
        <MenuAction onClick={closeMoreAfter(() => editor.chain().focus().setTextAlign('right').run())}>Align right</MenuAction>
        <MenuHeading>Insert</MenuHeading>
        <MenuAction onClick={closeMoreAfter(citeSource)}>Source citation</MenuAction>
        <MenuAction onClick={closeMoreAfter(insertTable)}>Table</MenuAction>
        <MenuAction onClick={closeMoreAfter(insertToc)}>Table of contents</MenuAction>
        <MenuAction onClick={closeMoreAfter(insertDetails)}>Collapsible details</MenuAction>
        <div className="px-2 py-1"><AdmonitionToolbarDropdown editor={editor} /></div>
        <MenuAction onClick={closeMoreAfter(() => editor.chain().focus().setHorizontalRule().run())}>Divider</MenuAction>
        <MenuHeading>Providers</MenuHeading>
        <MenuAction onClick={closeMoreAfter(() => openProvider(editor, 'references'))}>[[ References</MenuAction>
        <MenuAction onClick={closeMoreAfter(() => openProvider(editor, 'mentions'))}>@ Mentions</MenuAction>
        <MenuHeading>Tools</MenuHeading>
        <MenuAction onClick={closeMoreAfter(autoLink)}>Auto-Link</MenuAction>
        {canOpenWorkshop ? <MenuAction onClick={closeMoreAfter(workshop)}>Workshop</MenuAction> : null}
      </div> : null}
    </div>
  );

  return <div className="wiki-toolbar-container">
    <div className="relative flex min-w-0 max-w-full flex-wrap items-center gap-1 overflow-visible border-b border-border bg-surface/80 px-2 py-1.5">
      {paragraphControl}

      <ToolbarGroup label="Text formatting" className="wiki-toolbar-desktop">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><Underline className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough className="size-4" /></ToolbarButton>
        <EditorColorPickerToolbarButton kind="highlight" />
        <EditorColorPickerToolbarButton kind="text" />
        <ToolbarButton onClick={() => editor.chain().focus().unsetAllMarks().run()} title="Clear formatting"><Eraser className="size-4" /></ToolbarButton>
      </ToolbarGroup>
      <ToolbarGroup label="Lists" className="wiki-toolbar-desktop">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list"><ListOrdered className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Checklist"><CheckSquare className="size-4" /></ToolbarButton>
      </ToolbarGroup>
      <ToolbarGroup label="Alignment" className="wiki-toolbar-desktop">
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left"><AlignLeft className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center"><AlignCenter className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right"><AlignRight className="size-4" /></ToolbarButton>
      </ToolbarGroup>
      <ToolbarGroup label="Insert" className="wiki-toolbar-desktop">
        <ToolbarButton onClick={link} active={editor.isActive('link')} title="Link"><Link className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={citeSource} title="Source citation"><BookOpen className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={insertTable} title="Insert table"><LayoutGrid className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={insertToc} title="Table of contents"><ListTree className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={insertDetails} title="Collapsible details"><PanelTopClose className="size-4" /></ToolbarButton>
        <AdmonitionToolbarDropdown editor={editor} />
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus className="size-4" /></ToolbarButton>
      </ToolbarGroup>
      <ToolbarGroup label="Providers" className="wiki-toolbar-desktop">
        <LabeledButton label="/ Commands" title="Open command menu" onClick={() => openProvider(editor, 'commands')} />
        <LabeledButton label="[[ References" title="Open wiki reference picker" onClick={() => openProvider(editor, 'references')} />
        <LabeledButton label="@ Mentions" title="Open member and character picker" onClick={() => openProvider(editor, 'mentions')} />
      </ToolbarGroup>
      <ToolbarGroup label="Editor tools" className="wiki-toolbar-desktop">
        <ToolbarButton onClick={autoLink} title="Auto-Link"><Sparkles className="size-4" /></ToolbarButton>
        {canOpenWorkshop ? <ToolbarButton onClick={workshop} title="Open in Workshop"><PenLine className="size-4" /></ToolbarButton> : null}
      </ToolbarGroup>

      <ToolbarGroup label="Common formatting" className="wiki-toolbar-tablet">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><Underline className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough className="size-4" /></ToolbarButton>
      </ToolbarGroup>
      <ToolbarGroup label="Lists" className="wiki-toolbar-tablet">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list"><ListOrdered className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Checklist"><CheckSquare className="size-4" /></ToolbarButton>
      </ToolbarGroup>
      <ToolbarGroup label="Providers" className="wiki-toolbar-tablet">
        <LabeledButton label="/ Commands" title="Open command menu" onClick={() => openProvider(editor, 'commands')} />
        <LabeledButton label="[[ References" title="Open wiki reference picker" onClick={() => openProvider(editor, 'references')} />
        <LabeledButton label="@ Mentions" title="Open member and character picker" onClick={() => openProvider(editor, 'mentions')} />
      </ToolbarGroup>

      <ToolbarGroup label="Core formatting" className="wiki-toolbar-mobile">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><Underline className="size-4" /></ToolbarButton>
      </ToolbarGroup>
      <div className="wiki-toolbar-mobile"><LabeledButton label="/" title="Open command menu" onClick={() => openProvider(editor, 'commands')} /></div>
      <div className="wiki-toolbar-responsive-overflow">{overflowMenu}</div>
    </div>
    <ContextualToolbar editor={editor} campaignHandle={campaignHandle} flatPages={flatPages} />
  </div>;
}
