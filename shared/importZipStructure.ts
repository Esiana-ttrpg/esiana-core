import {
  fuzzyMatchImportModule,
  isCanonicalFolderName,
  sanitizeFolderForSearch,
} from './importModuleSynonyms.js';
import type { ImportModuleTarget } from './importSkeletonKeys.js';
import type { MappableImportModule } from './importModuleSynonyms.js';

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
