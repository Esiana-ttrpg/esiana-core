import { randomUUID } from 'node:crypto';
import type JSZip from 'jszip';
import {
  collectKankaJsonEntityPaths,
  normalizeZipPath,
} from '../../../shared/importZipStructure.js';
import {
  isKankaPlayerCharacterType,
  normalizeKankaEntityType,
} from '../../../shared/importModuleSynonyms.js';
import { isKankaSkippedFolder, kankaSkipReason, KANKA_SKIP_REASON_LABELS } from '../../../shared/importSkipPolicy.js';
import { mapKankaCharacterFields } from '../../../shared/importMappers/kankaCharacter.js';
import { extractKankaMapId, mapKankaMapFields } from '../../../shared/importMappers/kankaMap.js';
import {
  buildExternalEntityIndex,
  resolveExternalMentions,
} from '../../../shared/mentionResolvers/kankaMentions.js';
import type { VirtualNarrativeEntry } from '../../../shared/virtualNarrativeEntry.js';
import { htmlToMarkdown } from './htmlToMarkdown.js';

export type KankaCompileResult = {
  entries: VirtualNarrativeEntry[];
  externalKeyToPageId: Map<string, string>;
  skippedModuleCounts: Array<{ folder: string; entityCount: number; reason: string }>;
};

type ParsedKankaEntity = {
  folder: string;
  sourcePath: string;
  raw: Record<string, unknown>;
  entityId: string;
  name: string;
};

function extractEntityId(raw: Record<string, unknown>, sourcePath: string): string | null {
  const entity =
    raw.entity && typeof raw.entity === 'object'
      ? (raw.entity as Record<string, unknown>)
      : null;
  const fromEntity = entity?.id;
  if (typeof fromEntity === 'number') return String(fromEntity);
  if (typeof fromEntity === 'string' && fromEntity.trim()) return fromEntity.trim();
  const match = sourcePath.match(/_(\d+)\.json$/i);
  return match?.[1] ?? null;
}

function extractEntityName(raw: Record<string, unknown>): string {
  const entity =
    raw.entity && typeof raw.entity === 'object'
      ? (raw.entity as Record<string, unknown>)
      : null;
  const candidates = [raw.name, entity?.name];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return 'Untitled';
}

function kankaVisibility(raw: Record<string, unknown>): string {
  const entity =
    raw.entity && typeof raw.entity === 'object'
      ? (raw.entity as Record<string, unknown>)
      : null;
  const isPrivate = raw.is_private === 1 || entity?.is_private === 1;
  return isPrivate ? 'DM_Only' : 'Party';
}

function assembleHtmlBody(raw: Record<string, unknown>): string {
  const entity =
    raw.entity && typeof raw.entity === 'object'
      ? (raw.entity as Record<string, unknown>)
      : {};
  const parts: string[] = [];
  const mainEntry =
    (typeof entity.entry === 'string' ? entity.entry : null) ??
    (typeof raw.entry === 'string' ? raw.entry : '');
  if (mainEntry.trim()) parts.push(mainEntry);

  const posts = entity.posts;
  if (Array.isArray(posts)) {
    for (const post of posts) {
      if (!post || typeof post !== 'object') continue;
      const row = post as Record<string, unknown>;
      const name = typeof row.name === 'string' ? row.name.trim() : '';
      const entry = typeof row.entry === 'string' ? row.entry : '';
      if (!name && !entry) continue;
      parts.push(`<h3>${name}</h3>${entry}`);
    }
  }

  const eras = raw.eras;
  if (Array.isArray(eras)) {
    for (const era of eras) {
      if (!era || typeof era !== 'object') continue;
      const row = era as Record<string, unknown>;
      const name = typeof row.name === 'string' ? row.name.trim() : 'Era';
      const abbrev = typeof row.abbreviation === 'string' ? row.abbreviation.trim() : '';
      const entry = typeof row.entry === 'string' ? row.entry : '';
      const heading = abbrev ? `${name} (${abbrev})` : name;
      parts.push(`<h2>${heading}</h2>${entry}`);
    }
  }

  return parts.join('\n');
}

function virtualPathForEntity(folder: string, name: string, kankaType: string | null): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  if (folder === 'characters' && isKankaPlayerCharacterType(kankaType)) {
    return `characters/party/${slug || 'character'}.md`;
  }
  return `${folder}/${slug || 'entry'}.md`;
}

export async function compileKankaJsonZip(
  zip: JSZip,
  options?: { existingPageIdsByKankaKey?: Map<string, string> },
): Promise<KankaCompileResult> {
  const zipEntries = Object.keys(zip.files).filter((name) => !zip.files[name]?.dir);
  const entityPaths = collectKankaJsonEntityPaths(zipEntries);
  const skippedModuleCounts = new Map<string, number>();

  for (const rawPath of zipEntries.map(normalizeZipPath)) {
    if (!rawPath.toLowerCase().endsWith('.json')) continue;
    const parts = rawPath.split('/').filter(Boolean);
    if (parts.length < 2) continue;
    const folder = parts[0]!;
    if (isKankaSkippedFolder(folder)) {
      skippedModuleCounts.set(folder, (skippedModuleCounts.get(folder) ?? 0) + 1);
    }
  }

  const parsed: ParsedKankaEntity[] = [];
  for (const sourcePath of entityPaths) {
    const file = zip.file(sourcePath);
    if (!file) continue;
    const folder = sourcePath.split('/').filter(Boolean)[0]!;
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(await file.async('string')) as Record<string, unknown>;
    } catch {
      continue;
    }
    const entityId = extractEntityId(raw, sourcePath);
    if (!entityId) continue;
    parsed.push({
      folder,
      sourcePath,
      raw,
      entityId,
      name: extractEntityName(raw),
    });
  }

  const entityIndex = buildExternalEntityIndex(
    parsed.map((row) => ({ id: row.entityId, name: row.name, folder: row.folder })),
  );

  const entries: VirtualNarrativeEntry[] = [];
  const externalKeyToPageId = new Map<string, string>();

  for (const row of parsed) {
    const entity =
      row.raw.entity && typeof row.raw.entity === 'object'
        ? (row.raw.entity as Record<string, unknown>)
        : {};
    const kankaType =
      (typeof row.raw.type === 'string' ? row.raw.type : null) ??
      (typeof entity.type === 'string' ? entity.type : null);
    const entityType = normalizeKankaEntityType(row.folder, kankaType);
    let id = options?.existingPageIdsByKankaKey?.get(row.entityId) ?? randomUUID();
    externalKeyToPageId.set(row.entityId, id);
    const rawId = row.raw.id;
    if (typeof rawId === 'number') externalKeyToPageId.set(String(rawId), id);
    if (typeof rawId === 'string' && rawId.trim()) externalKeyToPageId.set(rawId.trim(), id);

    let body = htmlToMarkdown(assembleHtmlBody(row.raw));
    body = resolveExternalMentions(body, entityIndex);

    let characterMetadata: Record<string, unknown> | undefined;
    let deferredRefs = undefined as VirtualNarrativeEntry['deferredRefs'];
    let kankaMapId: string | undefined;
    let kankaMapPlan: VirtualNarrativeEntry['kankaMapPlan'];
    const frontmatter: Record<string, unknown> = {
      type: entityType,
      visibility: kankaVisibility(row.raw),
      title: row.name,
    };
    const importMetadataExtras: Record<string, unknown> = {};

    if (row.folder === 'maps') {
      const mappedMap = mapKankaMapFields(row.raw);
      if (mappedMap) {
        kankaMapId = mappedMap.kankaMapId;
        kankaMapPlan = mappedMap.kankaMapPlan;
        frontmatter.type = 'maps';
        const existingMapPageId = options?.existingPageIdsByKankaKey?.get(
          `map:${mappedMap.kankaMapId}`,
        );
        if (existingMapPageId) {
          id = existingMapPageId;
          externalKeyToPageId.set(mappedMap.kankaMapId, existingMapPageId);
        }
      }
    }

    if (row.folder === 'characters') {
      const mapped = mapKankaCharacterFields(row.raw);
      characterMetadata = mapped.characterMetadata;
      deferredRefs = mapped.deferredRefs;
      Object.assign(importMetadataExtras, mapped.importMetadataExtras);
      if (mapped.biographyAppendix) {
        body = body ? `${body}\n\n${mapped.biographyAppendix}` : mapped.biographyAppendix;
      }
      if (importMetadataExtras.level) {
        frontmatter.level = importMetadataExtras.level;
      }
    }

    const parentExternalId =
      typeof entity.parent_id === 'number'
        ? String(entity.parent_id)
        : typeof entity.parent_id === 'string'
          ? entity.parent_id
          : undefined;

    entries.push({
      id,
      title: row.name,
      type: entityType,
      body,
      frontmatter,
      source: 'kanka-json',
      sourcePath: virtualPathForEntity(row.folder, row.name, kankaType),
      externalId: row.entityId,
      parentExternalId,
      characterMetadata,
      deferredRefs,
      kankaMapId,
      kankaMapPlan,
      ...(Object.keys(importMetadataExtras).length
        ? { frontmatter: { ...frontmatter, ...importMetadataExtras } }
        : {}),
    });
  }

  return {
    entries,
    externalKeyToPageId,
    skippedModuleCounts: [...skippedModuleCounts.entries()].map(([folder, entityCount]) => {
      const reasonCode = kankaSkipReason(folder) ?? 'not_supported';
      return {
        folder,
        entityCount,
        reason: KANKA_SKIP_REASON_LABELS[reasonCode],
      };
    }),
  };
}
