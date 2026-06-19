/** Minimal semver satisfaction for plugin engine constraints (^x.y.z, >=x.y.z, exact). */

function parseVersion(value: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(a: [number, number, number], b: [number, number, number]): number {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function satisfiesEngineConstraint(
  hostVersion: string,
  constraint: string,
): boolean {
  const host = parseVersion(hostVersion);
  const trimmed = constraint.trim();
  if (!host) return false;

  if (trimmed.startsWith('^')) {
    const base = parseVersion(trimmed.slice(1));
    if (!base) return false;
    if (host[0] !== base[0]) return false;
    return compareVersions(host, base) >= 0;
  }

  if (trimmed.startsWith('>=')) {
    const upperBoundMatch = /^>=([^\s<]+)(?:\s*<(.+))?$/.exec(trimmed);
    if (upperBoundMatch) {
      const min = parseVersion(upperBoundMatch[1]);
      if (!min) return false;
      if (compareVersions(host, min) < 0) return false;
      const maxRaw = upperBoundMatch[2]?.trim();
      if (maxRaw) {
        const max = parseVersion(maxRaw);
        if (!max) return false;
        return compareVersions(host, max) < 0;
      }
      return true;
    }
  }

  const exact = parseVersion(trimmed);
  if (!exact) return false;
  return compareVersions(host, exact) === 0;
}

export function validatePluginEngines(
  hostVersion: string,
  engines: Record<string, string> | undefined,
): string | null {
  if (!engines) return null;
  const coreConstraint = engines['esiana-core'];
  if (!coreConstraint) return null;
  if (satisfiesEngineConstraint(hostVersion, coreConstraint)) return null;
  return `Plugin requires esiana-core ${coreConstraint}; host is ${hostVersion}`;
}
