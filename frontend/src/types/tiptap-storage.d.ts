import '@tiptap/core';

declare module '@tiptap/core' {
  interface Storage {
    wikiLink?: {
      enterAction?: unknown;
    };
  }
}
