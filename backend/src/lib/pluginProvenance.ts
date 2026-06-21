export type PluginInstalledFromType = 'registry' | 'manifest-url' | 'local-dev';

export interface PluginInstalledFrom {
  type: PluginInstalledFromType;
  registryUrl?: string;
  sourceRepo?: string;
  commitSha?: string;
}

const PINNED_SHA_RE = /^[0-9a-f]{40}$/i;

export function isPinnedCommitSha(value: string | null | undefined): boolean {
  return typeof value === 'string' && PINNED_SHA_RE.test(value);
}

export function deriveInstalledFrom(input: {
  commitSha?: string | null;
  sourceRepo?: string | null;
  githubUrl?: string | null;
  trustedInstall?: boolean | null;
  registryUrl?: string | null;
}): PluginInstalledFrom {
  const commitSha = input.commitSha?.trim() ?? '';
  const sourceRepo = input.sourceRepo?.trim() ?? '';

  if (isPinnedCommitSha(commitSha) && sourceRepo) {
    return {
      type: 'registry',
      ...(input.registryUrl ? { registryUrl: input.registryUrl } : {}),
      sourceRepo,
      commitSha,
    };
  }

  if (commitSha === 'bundled' || (!commitSha && !sourceRepo)) {
    return { type: 'local-dev' };
  }

  if (
    input.githubUrl &&
    !sourceRepo &&
    !isPinnedCommitSha(commitSha) &&
    commitSha !== 'bundled'
  ) {
    return { type: 'manifest-url' };
  }

  if (commitSha === 'bundled') {
    return { type: 'local-dev' };
  }

  return { type: 'local-dev' };
}

export function formatInstalledFromLabel(
  installedFrom: PluginInstalledFrom,
): string {
  switch (installedFrom.type) {
    case 'registry': {
      const repo =
        installedFrom.sourceRepo?.split('/').pop() ?? installedFrom.sourceRepo ?? 'registry';
      const shortSha = installedFrom.commitSha?.slice(0, 12) ?? '';
      return shortSha ? `${repo} (registry) @ ${shortSha}` : `${repo} (registry)`;
    }
    case 'manifest-url':
      return 'Manifest URL';
    case 'local-dev':
      return 'Local development';
    default:
      return 'Unknown';
  }
}

export function formatRegistryEntrySource(
  source?: { type?: string; repo?: string; commitSha?: string } | null,
): string | null {
  if (source?.type !== 'github' || !source.repo) return null;
  const shortSha =
    source.commitSha && isPinnedCommitSha(source.commitSha)
      ? source.commitSha.slice(0, 12)
      : null;
  return shortSha ? `${source.repo} @ ${shortSha}` : source.repo;
}
