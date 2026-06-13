/** Strip optional leading `v` and parse `major.minor.patch` (ignores pre-release/build suffix). */
export function parseSemverTriple(version: string): [number, number, number] | null {
  const cleaned = version.trim().replace(/^v/i, '');
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(cleaned);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isRemoteVersionNewer(remote: string, current: string): boolean {
  const remoteParts = parseSemverTriple(remote);
  const currentParts = parseSemverTriple(current);
  if (!remoteParts || !currentParts) return false;

  for (let i = 0; i < 3; i += 1) {
    if (remoteParts[i] > currentParts[i]) return true;
    if (remoteParts[i] < currentParts[i]) return false;
  }
  return false;
}
