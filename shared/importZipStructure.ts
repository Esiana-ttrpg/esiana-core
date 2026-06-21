import {
  fuzzyMatchImportModule,
  isCanonicalFolderName,
  sanitizeFolderForSearch,
} from './importModuleSynonyms.js';
import { isKankaSkippedFolder, kankaSkipReason, type SkipReasonCode } from './importSkipPolicy.js';
import type { ImportModuleTarget } from './importSkeletonKeys.js';
import type { MappableImportModule } from './importModuleSynonyms.js';
import type { ImportSourceFormat } from './virtualNarrativeEntry.js';

export type { MappableImportModule };

export interface ImportFolderMapping {
  sourceFolderName: string;
  targetModule: ImportModuleTarget | string;
}

export interface ImportFolderDiscovery {
  wrapperPrefix?: string;
  topLevelFolders: string[];
  canonicalAutoMapped: Array<{ folder: string; targetModule: MappableImportModule }>;
  needsMapping: string[];
}

export function normalizeZipPath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function isDotPathSegment(segment: string): boolean {
  return segment.startsWith('.');
}

export function collectMarkdownZipPaths(zipEntries: string[]): string[] {
  return zipEntries
    .map(normalizeZipPath)
    .filter((entry) => !entry.endsWith('/') && entry.toLowerCase().endsWith('.md'));
}

export function collectKankaJsonEntityPaths(zipEntries: string[]): string[] {
  return zipEntries
    .map(normalizeZipPath)
    .filter((entry) => {
      if (entry.endsWith('/')) return false;
      if (!entry.toLowerCase().endsWith('.json')) return false;
      const base = entry.split('/').pop() ?? '';
      if (base === 'campaign.json' || base === 'info.json') return false;
      const parts = entry.split('/').filter(Boolean);
      if (parts.length < 2) return false;
      return !isKankaSkippedFolder(parts[0]!);
    });
}

export type ZipImportFormatResult = {
  format: ImportSourceFormat | 'unknown';
  confidence: number;
  signals: string[];
};

export function detectZipImportFormat(zipEntries: string[]): ZipImportFormatResult {
  const normalized = zipEntries.map(normalizeZipPath);
  const signals: string[] = [];
  let confidence = 0;

  const hasInfoJson = normalized.some(
    (entry) => entry === 'info.json' || entry.endsWith('/info.json'),
  );
  const hasCampaignJson = normalized.some(
    (entry) => entry === 'campaign.json' || entry.endsWith('/campaign.json'),
  );
  const kankaEntityCount = collectKankaJsonEntityPaths(normalized).length;
  const mdCount = collectMarkdownZipPaths(normalized).length;

  if (hasInfoJson) {
    signals.push('info.json');
    confidence += 0.9;
  }
  if (hasCampaignJson && kankaEntityCount > 0) {
    signals.push(`kanka-entities:${kankaEntityCount}`);
    confidence += 0.5;
  }
  if (mdCount > 0) {
    signals.push(`md:${mdCount}`);
    confidence += 0.8;
  }

  if (hasInfoJson || (hasCampaignJson && kankaEntityCount > 0)) {
    return { format: 'kanka-json', confidence: Math.min(1, confidence), signals };
  }
  if (mdCount > 0) {
    return { format: 'obsidian', confidence: Math.min(1, confidence), signals };
  }
  return { format: 'unknown', confidence: 0, signals };
}

export interface KankaFolderDiscovery {
  topLevelFolders: string[];
  canonicalAutoMapped: Array<{ folder: string; targetModule: MappableImportModule }>;
  needsMapping: string[];
  skippedFolders: Array<{ folder: string; reason: SkipReasonCode; entityCount: number }>;
}

export function discoverKankaJsonFolders(zipEntries: string[]): KankaFolderDiscovery {
  const folderEntityCounts = new Map<string, number>();
  const skippedCounts = new Map<string, number>();

  for (const rawPath of zipEntries.map(normalizeZipPath)) {
    if (rawPath.endsWith('/')) continue;
    if (!rawPath.toLowerCase().endsWith('.json')) continue;
    const base = rawPath.split('/').pop() ?? '';
    if (base === 'campaign.json' || base === 'info.json') continue;
    const parts = rawPath.split('/').filter(Boolean);
    if (parts.length < 2) continue;
    const folder = parts[0]!;
    if (isDotPathSegment(folder)) continue;
    if (isKankaSkippedFolder(folder)) {
      const key = folder.toLowerCase();
      skippedCounts.set(key, (skippedCounts.get(key) ?? 0) + 1);
      continue;
    }
    folderEntityCounts.set(folder, (folderEntityCounts.get(folder) ?? 0) + 1);
  }

  const skippedFolders = [...skippedCounts.entries()]
    .map(([folder, entityCount]) => ({
      folder,
      reason: kankaSkipReason(folder)!,
      entityCount,
    }))
    .sort((a, b) => a.folder.localeCompare(b.folder));

  const topLevelFolders = [...folderEntityCounts.keys()].sort((a, b) => a.localeCompare(b));
  const canonicalAutoMapped: KankaFolderDiscovery['canonicalAutoMapped'] = [];
  const needsMapping: string[] = [];

  for (const folder of topLevelFolders) {
    const targetModule = fuzzyMatchImportModule(folder);
    if (targetModule) {
      canonicalAutoMapped.push({ folder, targetModule });
    } else {
      needsMapping.push(folder);
    }
  }

  return { topLevelFolders, canonicalAutoMapped, needsMapping, skippedFolders };
}

function stripWrapperPrefix(relativePath: string, wrapperPrefix?: string): string {
  if (!wrapperPrefix) return relativePath;
  const prefix = `${wrapperPrefix}/`;
  if (relativePath === wrapperPrefix) return relativePath;
  if (relativePath.startsWith(prefix)) {
    return relativePath.slice(prefix.length);
  }
  return relativePath;
}

export function detectWrapperPrefix(mdPaths: readonly string[]): string | undefined {
  const multiSegment = mdPaths
    .map((path) => path.split('/').filter(Boolean))
    .filter((parts) => parts.length > 1);
  if (multiSegment.length === 0) return undefined;

  const firstSegments = new Set(multiSegment.map((parts) => parts[0]!));
  if (firstSegments.size !== 1) return undefined;

  const prefix = [...firstSegments][0]!;
  if (isDotPathSegment(prefix) || isCanonicalFolderName(prefix)) return undefined;

  const allUnderPrefix = mdPaths.every((path) => {
    const parts = path.split('/').filter(Boolean);
    return parts.length === 1 || parts[0] === prefix;
  });
  if (!allUnderPrefix) return undefined;

  return prefix;
}

export function discoverImportFolders(zipEntries: string[]): ImportFolderDiscovery {
  const mdPaths = collectMarkdownZipPaths(zipEntries);
  const wrapperPrefix = detectWrapperPrefix(mdPaths);
  const folderNames = new Set<string>();

  for (const rawPath of mdPaths) {
    const path = stripWrapperPrefix(rawPath, wrapperPrefix);
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 1) continue;
    if (isDotPathSegment(parts[0]!)) continue;
    folderNames.add(parts[0]!);
  }

  const topLevelFolders = [...folderNames].sort((a, b) => a.localeCompare(b));
  const canonicalAutoMapped: ImportFolderDiscovery['canonicalAutoMapped'] = [];
  const needsMapping: string[] = [];

  for (const folder of topLevelFolders) {
    const targetModule = fuzzyMatchImportModule(folder);
    if (targetModule) {
      canonicalAutoMapped.push({ folder, targetModule });
    } else {
      needsMapping.push(folder);
    }
  }

  return { wrapperPrefix, topLevelFolders, canonicalAutoMapped, needsMapping };
}

export function normalizePathSegments(
  relativePath: string,
  wrapperPrefix?: string,
): { filename: string; segments: string[] } {
  const normalized = stripWrapperPrefix(normalizeZipPath(relativePath), wrapperPrefix);
  const parts = normalized.split('/').filter(Boolean);
  const filename = parts[parts.length - 1] ?? normalized;
  const segments = parts.length > 1 ? parts.slice(0, -1) : [];
  return { filename, segments: segments.filter((segment) => !isDotPathSegment(segment)) };
}

export function resolveWizardFolderMapping(
  segments: readonly string[],
  folderMappings: readonly ImportFolderMapping[] | undefined,
): MappableImportModule | 'Ignore Folder' | null {
  if (!folderMappings?.length) return null;
  for (const segment of segments) {
    const hit = folderMappings.find(
      (entry) =>
        sanitizeFolderForSearch(entry.sourceFolderName) === sanitizeFolderForSearch(segment),
    );
    if (!hit?.targetModule) continue;
    const target = hit.targetModule.toString().trim();
    if (target === 'Ignore Folder') return 'Ignore Folder';
    if (target) return target as MappableImportModule;
  }
  return null;
}

export function isLooseRootMarkdown(relativePath: string, wrapperPrefix?: string): boolean {
  const { segments } = normalizePathSegments(relativePath, wrapperPrefix);
  return segments.length === 0;
}
