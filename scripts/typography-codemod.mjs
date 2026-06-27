#!/usr/bin/env node
/**
 * One-off typography cleanup codemod — maps deprecated label/heading classes to surfaceLayout tokens.
 * Skips lines containing rounded-full (categorical pills).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'src');

const SECTION_PATTERNS = [
  [/className="text-xs font-semibold uppercase tracking-wider text-muted"/g, 'className={META_SECTION_LABEL_CLASS}'],
  [/className="text-xs font-semibold uppercase tracking-wide text-muted"/g, 'className={META_SECTION_LABEL_CLASS}'],
  [/className="mb-1\.5 text-xs font-semibold uppercase tracking-wider text-muted"/g, 'className={`mb-1.5 ${META_SECTION_LABEL_CLASS}`}'],
  [/className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted"/g, 'className={`mb-2 ${META_SECTION_LABEL_CLASS}`}'],
  [/className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted"/g, 'className={`mb-3 ${META_SECTION_LABEL_CLASS}`}'],
  [/className="text-\[10px\] font-semibold uppercase tracking-wider text-muted"/g, 'className={META_SECTION_LABEL_CLASS}'],
  [/className="mb-2 text-\[10px\] font-semibold uppercase tracking-wider text-muted"/g, 'className={`mb-2 ${META_SECTION_LABEL_CLASS}`}'],
  [/className="text-\[10px\] font-medium uppercase tracking-wide text-muted"/g, 'className={META_FIELD_LABEL_CLASS}'],
  [/className="text-\[11px\] font-bold uppercase tracking-wider text-muted"/g, 'className={META_FIELD_LABEL_CLASS}'],
  [/className="text-\[11px\] font-semibold uppercase tracking-wider text-muted"/g, 'className={META_FIELD_LABEL_CLASS}'],
  [/className="text-sm font-semibold uppercase tracking-wider text-muted"/g, 'className={META_SECTION_LABEL_CLASS}'],
  [/className="text-sm font-bold uppercase tracking-wider text-muted"/g, 'className={META_FIELD_LABEL_CLASS}'],
  [/className="mb-2 text-\[10px\] uppercase tracking-wide text-muted"/g, 'className={`mb-2 ${META_SECTION_LABEL_CLASS}`}'],
  [/className="mb-2 text-\[10px\] font-semibold uppercase tracking-wide text-muted"/g, 'className={`mb-2 ${META_SECTION_LABEL_CLASS}`}'],
  [/className="text-xs font-semibold uppercase tracking-wide text-primary"/g, 'className={META_SECTION_LABEL_CLASS}'],
  [/className="text-xs font-semibold uppercase tracking-wide text-muted"/g, 'className={META_SECTION_LABEL_CLASS}'],
  [/className="text-xs font-medium uppercase tracking-wide text-muted"/g, 'className={META_SECTION_LABEL_CLASS}'],
  [/className="mb-2 text-\[10px\] uppercase tracking-wide text-muted"/g, 'className={`mb-2 ${META_SECTION_LABEL_CLASS}`}'],
  [/className="text-\[10px\] font-semibold uppercase tracking-wide text-muted"/g, 'className={META_SECTION_LABEL_CLASS}'],
  [/className="text-\[10px\] uppercase tracking-wide text-muted"/g, 'className={META_SECTION_LABEL_CLASS}'],
  [/className="text-xs font-medium uppercase tracking-wide text-muted"/g, 'className={META_SECTION_LABEL_CLASS}'],
  [/className="text-xs font-semibold uppercase tracking-wide text-foreground"/g, 'className={META_SECTION_LABEL_CLASS}'],
  [/className="flex items-center gap-1 text-\[10px\] font-semibold uppercase tracking-wider text-muted hover:text-foreground"/g, 'className={`flex items-center gap-1 ${META_SECTION_LABEL_CLASS} hover:text-foreground`}'],
  [
    /className=\{`\$\{TYPE_META_CLASS\} font-semibold uppercase tracking-wider text-focal-muted`\}/g,
    'className={META_SECTION_LABEL_CLASS}',
  ],
  [
    /className=\{`\$\{TYPE_META_CLASS\} flex items-center gap-1\.5 font-semibold uppercase tracking-wider text-focal-muted`\}/g,
    'className={`flex items-center gap-1.5 ${META_SECTION_LABEL_CLASS}`}',
  ],
  [
    /className=\{`\$\{TYPE_META_CLASS\} cursor-pointer list-none font-semibold uppercase tracking-wider text-recessed-foreground marker:content-none \[&::-webkit-details-marker\]:hidden`\}/g,
    'className={`${META_SECTION_LABEL_CLASS} cursor-pointer list-none text-recessed-foreground marker:content-none [&::-webkit-details-marker]:hidden`}',
  ],
  [
    /className=\{`\$\{TYPE_META_CLASS\} font-semibold uppercase tracking-wider text-focal-muted`\}/g,
    'className={META_FIELD_LABEL_CLASS}',
  ],
];

const HERO_PATTERNS = [
  [/className="text-2xl font-semibold text-focal-foreground sm:text-3xl"/g, 'className={TYPE_DISPLAY_CLASS}'],
  [/className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"/g, 'className={TYPE_DISPLAY_CLASS}'],
  [/className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl"/g, 'className={TYPE_DISPLAY_CLASS}'],
  [/className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"/g, 'className={TYPE_DISPLAY_CLASS}'],
  [
    /className=\{`\$\{TYPE_DISPLAY_CLASS\} text-lg font-semibold text-focal-foreground sm:text-xl`\}/g,
    'className={TYPE_DISPLAY_CLASS}',
  ],
  [
    /className=\{`\$\{TYPE_DISPLAY_CLASS\} text-xl font-semibold text-focal-foreground`\}/g,
    'className={TYPE_DISPLAY_CLASS}',
  ],
  [
    /className=\{`\$\{TYPE_DISPLAY_CLASS\} mt-2 text-2xl font-bold tracking-tight text-display-foreground sm:text-3xl`\}/g,
    'className={`mt-2 ${TYPE_DISPLAY_CLASS}`}',
  ],
  [/className="text-lg font-semibold text-foreground"/g, 'className={TYPE_DISPLAY_CLASS}'],
  [/className="text-xl font-semibold text-foreground"/g, 'className={TYPE_DISPLAY_CLASS}'],
  [/className="text-2xl font-bold text-foreground"/g, 'className={TYPE_DISPLAY_CLASS}'],
  [/className="text-3xl font-bold text-foreground"/g, 'className={TYPE_DISPLAY_CLASS}'],
];

const IMPORT_META = `META_SECTION_LABEL_CLASS`;
const IMPORT_FIELD = `META_FIELD_LABEL_CLASS`;
const IMPORT_DISPLAY = `TYPE_DISPLAY_CLASS`;

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith('.tsx') || ent.name.endsWith('.ts')) files.push(p);
  }
  return files;
}

function ensureImports(content, needed) {
  const existing = content.match(/import\s*\{([^}]+)\}\s*from\s*'@\/lib\/surfaceLayout'/);
  const symbols = new Set(needed.filter((s) => content.includes(s)));
  if (symbols.size === 0) return content;

  const toAdd = [...symbols];
  if (existing) {
    const current = existing[1].split(',').map((s) => s.trim()).filter(Boolean);
    const merged = [...new Set([...current, ...toAdd])].sort();
    if (merged.length === current.length) return content;
    return content.replace(
      existing[0],
      `import { ${merged.join(', ')} } from '@/lib/surfaceLayout'`,
    );
  }

  const importLine = `import { ${toAdd.sort().join(', ')} } from '@/lib/surfaceLayout';\n`;
  const useClient = content.startsWith("'use client'");
  if (useClient) {
    const idx = content.indexOf('\n') + 1;
    return content.slice(0, idx) + importLine + content.slice(idx);
  }
  return importLine + content;
}

function isExemptLine(line) {
  return line.includes('rounded-full');
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const needed = new Set();

  const applyPatterns = (patterns) => {
    for (const [re, repl] of patterns) {
      content = content.replace(re, (match, offset) => {
        const lineStart = content.lastIndexOf('\n', offset) + 1;
        const lineEnd = content.indexOf('\n', offset);
        const line = content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
        if (isExemptLine(line)) return match;
        if (repl.includes('META_SECTION_LABEL')) needed.add(IMPORT_META);
        if (repl.includes('META_FIELD_LABEL')) needed.add(IMPORT_FIELD);
        if (repl.includes('TYPE_DISPLAY')) needed.add(IMPORT_DISPLAY);
        return repl;
      });
    }
  };

  applyPatterns(SECTION_PATTERNS);
  applyPatterns(HERO_PATTERNS);

  if (content === original) return false;

  content = ensureImports(content, [...needed]);
  fs.writeFileSync(filePath, content);
  return true;
}

const files = walk(ROOT);
let changed = 0;
for (const f of files) {
  if (f.includes('surfaceLayout.ts')) continue;
  if (processFile(f)) {
    changed++;
    console.log(path.relative(ROOT, f));
  }
}
console.log(`\nUpdated ${changed} files`);
