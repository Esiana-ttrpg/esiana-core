import type { ApiTokenScope } from '@/types/apiToken';
import { API_TOKEN_SCOPES } from '@/types/apiToken';

export type ApiTokenAccessMode = 'scoped' | 'full';

/** Human labels for the create-form picker only — not used in the active-keys list. */
export const API_TOKEN_SCOPE_OPTIONS: Array<{
  scope: ApiTokenScope;
  label: string;
}> = [
  { scope: 'campaign:read', label: 'Campaign read' },
  { scope: 'campaign:write', label: 'Campaign write' },
  { scope: 'campaign:seed', label: 'Campaign seed' },
  { scope: 'plugins:read', label: 'Plugins read' },
  { scope: 'plugins:manage', label: 'Plugins manage' },
];

/**
 * Label for an existing token's permissions in the active-keys list.
 * Empty / missing scopes = Full access (not “no permissions”).
 * Nonempty = raw scope identifiers.
 */
export function formatApiTokenScopesLabel(
  scopes: string[] | undefined | null,
): string {
  if (!scopes || scopes.length === 0) return 'Full access';
  return scopes.join(', ');
}

/**
 * Build the `scopes` array for create. Returns `null` when Scoped mode has
 * no selections (not submittable). Full access returns `[]`.
 */
export function buildCreateApiTokenScopes(
  mode: ApiTokenAccessMode,
  selected: readonly ApiTokenScope[],
): ApiTokenScope[] | null {
  if (mode === 'full') return [];
  if (selected.length === 0) return null;
  const known = new Set<string>(API_TOKEN_SCOPES);
  const scopes: ApiTokenScope[] = [];
  for (const scope of selected) {
    if (!known.has(scope)) continue;
    if (!scopes.includes(scope)) scopes.push(scope);
  }
  return scopes.length > 0 ? scopes : null;
}

export function canSubmitApiTokenPermissions(
  mode: ApiTokenAccessMode,
  selected: readonly ApiTokenScope[],
): boolean {
  return buildCreateApiTokenScopes(mode, selected) !== null;
}
