#!/usr/bin/env node
/** Third pass — uppercase tracking-wide section/field/table patterns */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'src');

const FROM_TO = [
  ['text-sm font-semibold uppercase tracking-wide text-muted', 'META_SECTION_LABEL_CLASS'],
  ['text-sm font-semibold uppercase tracking-wide text-muted-foreground', 'META_SECTION_LABEL_CLASS'],
  ['mb-4 text-sm font-semibold uppercase tracking-wide text-foreground', '`mb-4 ${META_SECTION_LABEL_CLASS}`'],
  ['mb-4 text-sm font-semibold uppercase tracking-wide text-cyan-200/90', '`mb-4 ${META_SECTION_LABEL_CLASS} text-cyan-200/90`'],
  ['mb-2 text-xs font-semibold uppercase tracking-wide text-muted', '`mb-2 ${META_SECTION_LABEL_CLASS}`'],
  ['text-xs font-semibold uppercase tracking-wide text-muted', 'META_SECTION_LABEL_CLASS'],
  ['text-xs font-semibold uppercase tracking-wide text-muted-foreground', 'META_SECTION_LABEL_CLASS'],
  ['text-xs font-semibold uppercase tracking-wide text-foreground', 'META_SECTION_LABEL_CLASS'],
  ['sticky top-0 z-10 bg-background/95 py-1 text-xs font-semibold uppercase tracking-wide text-muted', '`sticky top-0 z-10 bg-background/95 py-1 ${META_SECTION_LABEL_CLASS}`'],
  ['px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted', '`px-4 py-3 text-left ${META_TABLE_HEAD_CLASS}`'],
  ['border-b border-border bg-elevated/40 text-left text-xs font-semibold uppercase tracking-wide text-muted', '`border-b border-border bg-elevated/40 text-left ${META_TABLE_HEAD_CLASS}`'],
  ['sticky left-0 z-20 min-w-[180px] border-r border-border bg-muted/40 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground', '`sticky left-0 z-20 min-w-[180px] border-r border-border bg-muted/40 px-3 py-2 text-left ${META_TABLE_HEAD_CLASS}`'],
  ['border-r border-border px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground', '`border-r border-border px-2 py-2 text-center ${META_TABLE_HEAD_CLASS}`'],
  ['mb-2 text-xs font-medium uppercase tracking-wide text-muted', '`mb-2 ${META_SECTION_LABEL_CLASS}`'],
  ['text-xs font-medium uppercase tracking-wide text-muted', 'META_SECTION_LABEL_CLASS'],
  ['text-xs uppercase tracking-wide text-muted-foreground', 'META_SECTION_LABEL_CLASS'],
  ['text-xs uppercase tracking-wide text-muted', 'META_SECTION_LABEL_CLASS'],
  ['text-[11px] font-medium uppercase tracking-wide text-muted', 'META_SECTION_LABEL_CLASS'],
  ['text-[10px] font-medium uppercase tracking-wide text-muted', 'META_SECTION_LABEL_CLASS'],
  ['flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted', '`flex items-center gap-1.5 ${META_SECTION_LABEL_CLASS}`'],
  ['bg-surface/90 px-4 py-2 text-xs uppercase tracking-wide text-muted rounded-t-lg', '`bg-surface/90 px-4 py-2 rounded-t-lg ${META_SECTION_LABEL_CLASS}`'],
  ['rounded-t-lg bg-surface/90 px-4 py-2 text-xs uppercase tracking-wide text-muted', '`rounded-t-lg bg-surface/90 px-4 py-2 ${META_SECTION_LABEL_CLASS}`'],
  ['text-xs font-bold uppercase tracking-widest text-muted', 'META_SECTION_LABEL_CLASS'],
  ['text-xs font-bold uppercase tracking-widest text-primary/90', '`${META_SECTION_LABEL_CLASS} text-primary/90`'],
  ['mb-2 text-[10px] font-bold uppercase tracking-widest text-muted', '`mb-2 ${META_SECTION_LABEL_CLASS}`'],
  ['text-[10px] font-bold uppercase tracking-widest text-muted', 'META_SECTION_LABEL_CLASS'],
  ['rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors', 'rounded-md px-2.5 py-1 text-xs font-medium transition-colors'],
  ['text-[10px] font-medium uppercase tracking-wide text-muted', 'META_FIELD_LABEL_CLASS'],
  ['block space-y-0.5 text-[10px] uppercase tracking-wide text-muted', '`block space-y-0.5 ${META_FIELD_LABEL_CLASS}`'],
  ['cursor-pointer text-[10px] font-medium uppercase tracking-wide text-muted', '`cursor-pointer ${META_SECTION_LABEL_CLASS}`'],
  ['text-[10px] font-semibold uppercase tracking-wide text-amber-400/90', '`${META_SECTION_LABEL_CLASS} text-amber-400/90`'],
  ['bg-elevated/60 text-left text-xs uppercase tracking-wide text-muted', '`bg-elevated/60 text-left ${META_SECTION_LABEL_CLASS}`'],
  ['mb-3 flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wide text-muted', '`mb-3 flex w-full items-center justify-between text-left ${META_SECTION_LABEL_CLASS}`'],
  ['text-xs font-medium uppercase tracking-wide text-primary', '`${META_SECTION_LABEL_CLASS} text-primary`'],
  ['text-xs font-medium uppercase tracking-wide text-foreground', 'META_SECTION_LABEL_CLASS'],
  ['inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-foreground', '`inline-flex items-center gap-1 ${META_SECTION_LABEL_CLASS}`'],
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith('.tsx') || ent.name.endsWith('.ts')) files.push(p);
  }
  return files;
}

function symFor(to) {
  if (to.includes('META_TABLE')) return 'META_TABLE_HEAD_CLASS';
  if (to.includes('META_FIELD')) return 'META_FIELD_LABEL_CLASS';
  return 'META_SECTION_LABEL_CLASS';
}

function ensureImports(content, symbols) {
  const needed = [...symbols].filter((s) => content.includes(s));
  if (!needed.length) return content;
  const existing = content.match(/import\s*\{([^}]+)\}\s*from\s*'@\/lib\/surfaceLayout'/);
  if (existing) {
    const current = existing[1].split(',').map((s) => s.trim()).filter(Boolean);
    const merged = [...new Set([...current, ...needed])].sort();
    return content.replace(existing[0], `import { ${merged.join(', ')} } from '@/lib/surfaceLayout'`);
  }
  const line = `import { ${needed.sort().join(', ')} } from '@/lib/surfaceLayout';\n`;
  if (content.startsWith("'use client'")) {
    return content.slice(0, content.indexOf('\n') + 1) + line + content.slice(content.indexOf('\n') + 1);
  }
  return line + content;
}

function processFile(filePath) {
  if (filePath.includes('surfaceLayout.ts')) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const needed = new Set();

  for (const [from, to] of FROM_TO) {
    if (!content.includes(from)) continue;
    const lines = content.split('\n');
    content = lines
      .map((line) => {
        if (!line.includes(from) || line.includes('rounded-full')) return line;
        if (line.includes('rounded px-') || line.includes('rounded-md px-') && line.includes('uppercase')) {
          // small categorical chips with rounded (not full)
          if (line.includes('text-[9px]') || line.includes('text-[10px]') && line.includes('shrink-0')) return line;
        }
        needed.add(symFor(to));
        if (line.includes(`className="${from}"`)) {
          const val = to.startsWith('`') ? to : to;
          return line.replace(`className="${from}"`, val.startsWith('`') ? `className={${val}}` : `className={${to}}`);
        }
        if (line.includes(`'${from}'`)) {
          return line.replace(`'${from}'`, to.startsWith('`') ? to.slice(1, -1) : to);
        }
        if (line.includes(`"${from}"`)) {
          return line.replace(`"${from}"`, to.startsWith('`') ? `{${to}}` : `{${to}}`);
        }
        return line.replace(from, to.startsWith('`') ? to.slice(1, -1) : to);
      })
      .join('\n');
  }

  if (content === original) return false;
  content = ensureImports(content, needed);
  fs.writeFileSync(filePath, content);
  return true;
}

let n = 0;
for (const f of walk(ROOT)) {
  if (processFile(f)) {
    n++;
    console.log(path.relative(ROOT, f));
  }
}
console.log(`\nPass 3: ${n} files`);
