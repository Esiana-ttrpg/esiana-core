#!/usr/bin/env node
/** Second-pass global string replacements for typography cleanup */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'src');

const REPLACEMENTS = [
  ['mb-1 block text-xs font-semibold uppercase tracking-wider text-muted', 'META_FIELD_LABEL_CLASS'],
  ['mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted', 'META_FIELD_LABEL_CLASS'],
  ['mb-2 text-[11px] font-bold uppercase tracking-wider text-muted', '`mb-2 ${META_FIELD_LABEL_CLASS}`'],
  ['mb-3 text-[11px] font-bold uppercase tracking-wider text-muted', '`mb-3 ${META_FIELD_LABEL_CLASS}`'],
  ['mb-2 text-[11px] font-bold uppercase tracking-wider text-red-300', '`mb-2 ${META_FIELD_LABEL_CLASS} text-red-300`'],
  ['mb-3 px-1 text-[11px] font-bold uppercase tracking-wider text-muted', '`mb-3 px-1 ${META_FIELD_LABEL_CLASS}`'],
  ['mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted', '`mb-1.5 ${META_FIELD_LABEL_CLASS}`'],
  ['mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted', 'META_FIELD_LABEL_CLASS'],
  ['px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted', '`px-4 py-3 text-left ${META_TABLE_HEAD_CLASS}`'],
  ['px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted', '`px-4 py-3 text-right ${META_TABLE_HEAD_CLASS}`'],
  ['mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted', '`mb-3 ${META_SECTION_LABEL_CLASS}`'],
  ['mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted', '`mb-3 flex items-center gap-2 ${META_SECTION_LABEL_CLASS}`'],
  ['mb-3 text-sm font-semibold uppercase tracking-wider text-muted', '`mb-3 ${META_SECTION_LABEL_CLASS}`'],
  ['mb-4 text-sm font-semibold uppercase tracking-wider text-muted', '`mb-4 ${META_SECTION_LABEL_CLASS}`'],
  ['mb-3 text-sm font-semibold uppercase tracking-wider text-foreground', '`mb-3 ${META_SECTION_LABEL_CLASS} text-foreground`'],
  ['text-sm font-semibold uppercase tracking-wider text-foreground', '`${META_SECTION_LABEL_CLASS} text-foreground`'],
  ['text-[11px] font-medium uppercase tracking-wider text-muted', 'META_SECTION_LABEL_CLASS'],
  ['text-xs font-semibold uppercase tracking-wider text-focal-muted', 'META_SECTION_LABEL_CLASS'],
  ['text-xs uppercase tracking-wider text-muted', 'META_SECTION_LABEL_CLASS'],
  ['text-xs uppercase tracking-wider text-primary/80', '`${META_SECTION_LABEL_CLASS} text-primary/80`'],
  ['text-xs font-semibold uppercase tracking-wider text-primary/80', '`${META_SECTION_LABEL_CLASS} text-primary/80`'],
  ['text-xs font-semibold uppercase tracking-wider text-sky-200/80', '`${META_SECTION_LABEL_CLASS} text-sky-200/80`'],
  ['text-xs font-semibold uppercase tracking-wider text-indigo-200/80', '`${META_SECTION_LABEL_CLASS} text-indigo-200/80`'],
  ['text-xs font-semibold uppercase tracking-wider text-primary/90', '`${META_SECTION_LABEL_CLASS} text-primary/90`'],
  ['text-xs uppercase tracking-wider text-muted', 'META_SECTION_LABEL_CLASS'],
  ['border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted', '`border-b border-border px-3 py-2 ${META_SECTION_LABEL_CLASS}`'],
  ['mb-2 text-[10px] font-medium uppercase tracking-wider text-muted', '`mb-2 ${META_SECTION_LABEL_CLASS}`'],
  ['mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted', '`mb-2 ${META_SECTION_LABEL_CLASS}`'],
  ['mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200/80', '`mb-2 flex items-center gap-1.5 ${META_SECTION_LABEL_CLASS} text-cyan-200/80`'],
  ['flex w-full items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted hover:text-foreground', '`flex w-full items-center gap-1 ${META_SECTION_LABEL_CLASS} hover:text-foreground`'],
  ['text-[10px] uppercase tracking-wider text-amber-300/80', '`${META_SECTION_LABEL_CLASS} text-amber-300/80`'],
  ['block text-[10px] font-medium uppercase tracking-wider text-muted', 'META_SECTION_LABEL_CLASS'],
  ['text-[10px] font-medium uppercase tracking-wider text-muted', 'META_SECTION_LABEL_CLASS'],
  [
    '${TYPE_META_CLASS} flex items-center gap-1.5 font-semibold uppercase tracking-wider text-contextual-foreground/85 opacity-75',
    '`flex items-center gap-1.5 ${META_SECTION_LABEL_CLASS} text-contextual-foreground/85 opacity-75`',
  ],
  ['bg-surface/90 text-left text-xs uppercase tracking-wider text-muted', '`bg-surface/90 text-left ${META_SECTION_LABEL_CLASS}`'],
  ['border-b border-border bg-surface/80 text-xs uppercase tracking-wider text-muted', '`border-b border-border bg-surface/80 ${META_SECTION_LABEL_CLASS}`'],
];

const IMPORTS = {
  META_SECTION_LABEL_CLASS: true,
  META_FIELD_LABEL_CLASS: true,
  META_TABLE_HEAD_CLASS: true,
};

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith('.tsx')) files.push(p);
  }
  return files;
}

function ensureImports(content, symbols) {
  const needed = [...symbols].filter((s) => content.includes(s));
  if (needed.length === 0) return content;
  const existing = content.match(/import\s*\{([^}]+)\}\s*from\s*'@\/lib\/surfaceLayout'/);
  if (existing) {
    const current = existing[1].split(',').map((s) => s.trim()).filter(Boolean);
    const merged = [...new Set([...current, ...needed])].sort();
    if (merged.join(', ') === current.join(', ')) return content;
    return content.replace(existing[0], `import { ${merged.join(', ')} } from '@/lib/surfaceLayout'`);
  }
  const line = `import { ${needed.sort().join(', ')} } from '@/lib/surfaceLayout';\n`;
  if (content.startsWith("'use client'")) {
    const idx = content.indexOf('\n') + 1;
    return content.slice(0, idx) + line + content.slice(idx);
  }
  return line + content;
}

function processFile(filePath) {
  if (filePath.includes('surfaceLayout.ts')) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const needed = new Set();

  for (const [from, to] of REPLACEMENTS) {
    if (!content.includes(from)) continue;
    const isConst = ['META_FIELD_LABEL_CLASS', 'META_SECTION_LABEL_CLASS', 'META_TABLE_HEAD_CLASS'].includes(to);
    const isTemplate = to.startsWith('`');
    const replacement = isConst
      ? `className={${to}}`
      : isTemplate
        ? `className={${to}}`
        : to;

    content = content.split('\n').map((line) => {
      if (line.includes('rounded-full')) return line;
      if (!line.includes(from)) return line;
      if (line.includes('className="') && line.includes(from)) {
        needed.add(isConst ? to : to.match(/\$\{(\w+)/)?.[1] ?? to.includes('META_FIELD') ? 'META_FIELD_LABEL_CLASS' : to.includes('META_TABLE') ? 'META_TABLE_HEAD_CLASS' : 'META_SECTION_LABEL_CLASS');
        return line.replace(`className="${from}"`, replacement);
      }
      if (line.includes('className={`') && line.includes(from)) {
        const sym = from.includes('TYPE_META') ? 'META_SECTION_LABEL_CLASS' : 'META_SECTION_LABEL_CLASS';
        needed.add(sym);
        return line.replace(from, to.replace(/`/g, ''));
      }
      if (line.includes(from) && (line.includes('className=') || line.includes('const ') || line.includes("'"))) {
        const sym = from.includes('mb-1 block') || from.includes('font-bold') ? 'META_FIELD_LABEL_CLASS' : from.includes('px-4 py-3') ? 'META_TABLE_HEAD_CLASS' : 'META_SECTION_LABEL_CLASS';
        needed.add(sym);
        if (line.includes(`'${from}'`)) {
          return line.replace(`'${from}'`, isConst ? to : to.replace(/`/g, ''));
        }
        if (line.includes(`"${from}"`)) {
          return line.replace(`"${from}"`, isConst ? `{${to}}` : to.replace(/`/g, ''));
        }
      }
      return line;
    }).join('\n');
  }

  // Fix className={META_FIELD_LABEL_CLASS} inside template strings for session schedule
  content = content.replace(
    /className="mb-1 block text-\[11px\] font-bold uppercase tracking-wider text-muted"/g,
    'className={META_FIELD_LABEL_CLASS}',
  );

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
console.log(`\nPass 2: ${n} files`);
