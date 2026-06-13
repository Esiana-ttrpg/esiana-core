import { useMemo } from 'react';

export interface IdentityDisplaySource {
  label?: string;
  displayName?: string | null;
  playerContext?: string | null;
  identityPageId?: string | null;
  identityPageTitle?: string | null;
}

export interface IdentityDisplayResult {
  displayName: string | null;
  playerContext: string;
  primaryLabel: string;
  showSecondary: boolean;
}

export function resolveIdentityDisplay(
  source: IdentityDisplaySource,
): IdentityDisplayResult {
  const displayName =
    source.displayName?.trim() ||
    source.identityPageTitle?.trim() ||
    null;
  const playerContext =
    source.playerContext?.trim() || source.label?.trim() || 'Unknown';
  const primaryLabel = displayName ?? playerContext;
  const showSecondary = Boolean(displayName);

  return {
    displayName,
    playerContext,
    primaryLabel,
    showSecondary,
  };
}

export function useIdentityDisplay(
  source: IdentityDisplaySource,
): IdentityDisplayResult {
  return useMemo(() => resolveIdentityDisplay(source), [
    source.displayName,
    source.identityPageId,
    source.identityPageTitle,
    source.label,
    source.playerContext,
  ]);
}
