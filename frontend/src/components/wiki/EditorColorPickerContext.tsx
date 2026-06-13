import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import { Highlighter, Type, X } from 'lucide-react';
import {
  EDITOR_HIGHLIGHT_COLOR_ORDER,
  EDITOR_TEXT_COLOR_ORDER,
  editorHighlightColorStyle,
  editorTextColorStyle,
  type EditorHighlightColorId,
  type EditorTextColorId,
} from '@/lib/editor/editorColorTokens';

type ColorKind = 'text' | 'highlight';

type ColorId = EditorTextColorId | EditorHighlightColorId;

interface SelectionSnapshot {
  from: number;
  to: number;
  color: string | null;
}

interface EditorColorPickerActions {
  togglePicker: (kind: ColorKind) => void;
  handleClear: () => void;
  handleSelect: (colorId: ColorId) => void;
  handleSwatchEnter: (colorId: ColorId) => void;
  handleSwatchLeave: () => void;
  getActiveColor: (kind: ColorKind) => string | null;
}

interface EditorColorPickerContextValue extends EditorColorPickerActions {
  editor: Editor;
  openKind: ColorKind | null;
}

const EditorColorPickerContext = createContext<EditorColorPickerContextValue | null>(
  null,
);

const GRID_COLS = 8;

function colorOrder(kind: ColorKind): readonly ColorId[] {
  return kind === 'text' ? EDITOR_TEXT_COLOR_ORDER : EDITOR_HIGHLIGHT_COLOR_ORDER;
}

function colorStyle(kind: ColorKind, id: ColorId): string {
  return kind === 'text'
    ? editorTextColorStyle(id as EditorTextColorId)
    : editorHighlightColorStyle(id as EditorHighlightColorId);
}

function markName(kind: ColorKind): 'textColor' | 'highlight' {
  return kind === 'text' ? 'textColor' : 'highlight';
}

function readActiveColor(editor: Editor, kind: ColorKind): string | null {
  const attrs = editor.getAttributes(markName(kind));
  const color = attrs.color;
  return typeof color === 'string' ? color : null;
}

function applyColor(editor: Editor, kind: ColorKind, colorId: ColorId | null) {
  const chain = editor.chain().focus();
  if (kind === 'text') {
    if (colorId) {
      chain.setTextColor({ color: colorId }).run();
    } else {
      chain.unsetTextColor().run();
    }
    return;
  }
  if (colorId) {
    chain.setHighlight({ color: colorId }).run();
  } else {
    chain.unsetHighlight().run();
  }
}

function previewColor(
  editor: Editor,
  kind: ColorKind,
  snapshot: SelectionSnapshot,
  colorId: ColorId,
) {
  if (snapshot.from === snapshot.to) return;
  editor
    .chain()
    .setTextSelection({ from: snapshot.from, to: snapshot.to })
    .run();
  applyColor(editor, kind, colorId);
}

function restoreSnapshot(editor: Editor, kind: ColorKind, snapshot: SelectionSnapshot) {
  if (snapshot.from === snapshot.to) return;
  editor.chain().setTextSelection({ from: snapshot.from, to: snapshot.to }).run();
  applyColor(editor, kind, snapshot.color as ColorId | null);
}

function useEditorColorPickerContext(): EditorColorPickerContextValue {
  const context = useContext(EditorColorPickerContext);
  if (!context) {
    throw new Error('Editor color picker components must be used within EditorColorPickerProvider');
  }
  return context;
}

interface EditorColorPickerProviderProps {
  editor: Editor | null;
  children: ReactNode;
}

export function EditorColorPickerProvider({ editor, children }: EditorColorPickerProviderProps) {
  const [openKind, setOpenKind] = useState<ColorKind | null>(null);
  const snapshotRef = useRef<SelectionSnapshot | null>(null);
  const committedRef = useRef(false);
  const openKindRef = useRef<ColorKind | null>(null);
  openKindRef.current = openKind;

  const captureSnapshot = useCallback((kind: ColorKind) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    snapshotRef.current = {
      from,
      to,
      color: readActiveColor(editor, kind),
    };
    committedRef.current = false;
  }, [editor]);

  const closePicker = useCallback(
    (commit: boolean) => {
      if (!editor) return;
      const kind = openKindRef.current;
      const snapshot = snapshotRef.current;
      if (!commit && kind && snapshot && !committedRef.current) {
        restoreSnapshot(editor, kind, snapshot);
      }
      snapshotRef.current = null;
      setOpenKind(null);
    },
    [editor],
  );

  const togglePicker = useCallback(
    (kind: ColorKind) => {
      if (!editor) return;
      if (openKindRef.current === kind) {
        closePicker(committedRef.current);
        return;
      }
      if (openKindRef.current) {
        closePicker(committedRef.current);
      }
      captureSnapshot(kind);
      setOpenKind(kind);
    },
    [editor, captureSnapshot, closePicker],
  );

  const handleClear = useCallback(() => {
    if (!editor || !openKindRef.current) return;
    committedRef.current = true;
    applyColor(editor, openKindRef.current, null);
    closePicker(true);
  }, [editor, closePicker]);

  const handleSelect = useCallback(
    (colorId: ColorId) => {
      if (!editor || !openKindRef.current) return;
      committedRef.current = true;
      applyColor(editor, openKindRef.current, colorId);
      closePicker(true);
    },
    [editor, closePicker],
  );

  const handleSwatchEnter = useCallback(
    (colorId: ColorId) => {
      if (!editor || !openKindRef.current) return;
      const snapshot = snapshotRef.current;
      if (!snapshot || snapshot.from === snapshot.to) return;
      previewColor(editor, openKindRef.current, snapshot, colorId);
    },
    [editor],
  );

  const handleSwatchLeave = useCallback(() => {
    if (!editor || !openKindRef.current) return;
    const snapshot = snapshotRef.current;
    if (!snapshot || committedRef.current || snapshot.from === snapshot.to) return;
    restoreSnapshot(editor, openKindRef.current, snapshot);
  }, [editor]);

  const getActiveColor = useCallback(
    (kind: ColorKind) => (editor ? readActiveColor(editor, kind) : null),
    [editor],
  );

  useEffect(() => {
    if (!openKind) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-editor-color-picker]')) return;
      closePicker(committedRef.current);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openKind, closePicker]);

  if (!editor) {
    return <>{children}</>;
  }

  const value: EditorColorPickerContextValue = {
    editor,
    openKind,
    togglePicker,
    handleClear,
    handleSelect,
    handleSwatchEnter,
    handleSwatchLeave,
    getActiveColor,
  };

  return (
    <EditorColorPickerContext.Provider value={value}>
      {children}
    </EditorColorPickerContext.Provider>
  );
}

export function EditorColorPickerToolbarButton({ kind }: { kind: ColorKind }) {
  const { editor, openKind, togglePicker } = useEditorColorPickerContext();
  const title = kind === 'text' ? 'Text color' : 'Highlight color';
  const TriggerIcon = kind === 'text' ? Type : Highlighter;
  const isOpen = openKind === kind;

  const selectActiveColor = useCallback(
    ({ editor: ed }: { editor: Editor }) => readActiveColor(ed, kind),
    [kind],
  );

  const currentColor = useEditorState({
    editor,
    selector: selectActiveColor,
  });

  const indicatorColor = currentColor
    ? colorStyle(kind, currentColor as ColorId)
    : 'var(--color-focal-muted)';

  return (
    <button
      type="button"
      data-editor-color-picker
      title={title}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      onClick={() => togglePicker(kind)}
      className={`rounded-md p-1.5 transition-colors ${
        isOpen || currentColor
          ? 'bg-primary/20 text-primary'
          : 'text-muted hover:bg-elevated hover:text-foreground'
      }`}
    >
      <span className="relative inline-flex flex-col items-center">
        <TriggerIcon className="size-4" />
        <span
          className="mt-0.5 h-0.5 w-3.5 rounded-full"
          style={{ backgroundColor: indicatorColor }}
        />
      </span>
    </button>
  );
}

export function EditorColorPickerPanel() {
  const {
    editor,
    openKind,
    handleClear,
    handleSelect,
    handleSwatchEnter,
    handleSwatchLeave,
  } = useEditorColorPickerContext();

  const selectActiveColor = useCallback(
    ({ editor: ed }: { editor: Editor }) =>
      openKind ? readActiveColor(ed, openKind) : null,
    [openKind],
  );

  const activeColor = useEditorState({
    editor,
    selector: selectActiveColor,
  });

  if (!openKind) return null;

  const colors = colorOrder(openKind);
  const title = openKind === 'text' ? 'Text color' : 'Highlight color';

  return (
    <div
      data-editor-color-picker
      role="dialog"
      aria-label={title}
      className="border-b border-border bg-surface/95 px-3 py-2"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="shrink-0 text-xs font-medium text-muted">{title}</span>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted transition-colors hover:bg-elevated hover:text-foreground"
        >
          <X className="size-3" />
          Default
        </button>
        <div
          className="grid flex-1 gap-1.5"
          style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1.5rem))` }}
        >
          {colors.map((colorId) => {
            const selected = activeColor === colorId;
            return (
              <button
                key={colorId}
                type="button"
                title={colorId}
                aria-label={colorId}
                aria-pressed={selected}
                onMouseEnter={() => handleSwatchEnter(colorId)}
                onMouseLeave={handleSwatchLeave}
                onClick={() => handleSelect(colorId)}
                className={`size-6 rounded-full border border-border/50 transition-transform hover:scale-110 ${
                  selected ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface' : ''
                }`}
                style={{ backgroundColor: colorStyle(openKind, colorId) }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
