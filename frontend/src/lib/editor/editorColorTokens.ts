export const EDITOR_TEXT_COLOR_ORDER = [
  'rose',
  'pink',
  'violet',
  'blue',
  'cyan',
  'teal',
  'green',
  'amber',
  'orange',
  'red',
  'gray',
  'slate',
  'brown',
] as const;

export const EDITOR_HIGHLIGHT_COLOR_ORDER = [
  'pink',
  'violet',
  'blue',
  'amber',
  'green',
  'teal',
  'red',
  'gray',
] as const;

export type EditorTextColorId = (typeof EDITOR_TEXT_COLOR_ORDER)[number];
export type EditorHighlightColorId = (typeof EDITOR_HIGHLIGHT_COLOR_ORDER)[number];

const TEXT_COLOR_SET = new Set<string>(EDITOR_TEXT_COLOR_ORDER);
const HIGHLIGHT_COLOR_SET = new Set<string>(EDITOR_HIGHLIGHT_COLOR_ORDER);

export function isEditorTextColorId(value: string): value is EditorTextColorId {
  return TEXT_COLOR_SET.has(value);
}

export function isEditorHighlightColorId(value: string): value is EditorHighlightColorId {
  return HIGHLIGHT_COLOR_SET.has(value);
}

export function editorTextVar(id: EditorTextColorId): `--editor-text-${EditorTextColorId}` {
  return `--editor-text-${id}`;
}

export function editorHighlightVar(
  id: EditorHighlightColorId,
): `--editor-highlight-${EditorHighlightColorId}` {
  return `--editor-highlight-${id}`;
}

export function editorTextColorStyle(id: EditorTextColorId): string {
  return `var(${editorTextVar(id)})`;
}

export function editorHighlightColorStyle(id: EditorHighlightColorId): string {
  return `var(${editorHighlightVar(id)})`;
}
