import type {
  EntityHistoricalAliasRecord,
  LoreInterpretationAccountRecord,
  LoreInterpretationGroupRecord,
} from '@/lib/loreKnowledgeProjection';
import type { LoreClaimWithSources } from '@/lib/loreKnowledgeApi';

export type LoreSemanticBundle = {
  aliases: EntityHistoricalAliasRecord[];
  canonicalTitle: string;
  groups: LoreInterpretationGroupRecord[];
  accounts: LoreInterpretationAccountRecord[];
  claims: LoreClaimWithSources[];
};

export type LoreSemanticBundleErrors = {
  aliases?: string;
  interpretations?: string;
  claims?: string;
};

export type LoreSemanticBundleStatus = 'idle' | 'loading' | 'ready' | 'empty';

export const EMPTY_LORE_SEMANTIC_BUNDLE: LoreSemanticBundle = {
  aliases: [],
  canonicalTitle: '',
  groups: [],
  accounts: [],
  claims: [],
};

export function sliceErrorMessage(reason: unknown): string {
  if (reason instanceof Error && reason.message.trim()) {
    return reason.message;
  }
  return 'Failed to load';
}

export function isLoreSemanticBundleEmpty(bundle: LoreSemanticBundle): boolean {
  return (
    bundle.aliases.length === 0 &&
    bundle.accounts.length === 0 &&
    bundle.claims.length === 0
  );
}

export function resolveLoreSemanticBundleStatus(
  bundle: LoreSemanticBundle,
  errors: LoreSemanticBundleErrors,
): 'empty' | 'ready' {
  const hasErrors = Boolean(
    errors.aliases || errors.interpretations || errors.claims,
  );
  if (!hasErrors && isLoreSemanticBundleEmpty(bundle)) {
    return 'empty';
  }
  return 'ready';
}

type SettledSlice<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function resolveLoreSemanticBundleFromSettled(input: {
  aliases: SettledSlice<{ aliases: EntityHistoricalAliasRecord[]; canonicalTitle: string }>;
  interpretations: SettledSlice<{
    groups: LoreInterpretationGroupRecord[];
    accounts: LoreInterpretationAccountRecord[];
  }>;
  claims: SettledSlice<LoreClaimWithSources[]>;
}): { bundle: LoreSemanticBundle; errors: LoreSemanticBundleErrors } {
  const errors: LoreSemanticBundleErrors = {};
  const bundle: LoreSemanticBundle = { ...EMPTY_LORE_SEMANTIC_BUNDLE };

  if (input.aliases.ok) {
    bundle.aliases = input.aliases.value.aliases;
    bundle.canonicalTitle = input.aliases.value.canonicalTitle;
  } else {
    errors.aliases = input.aliases.error;
  }

  if (input.interpretations.ok) {
    bundle.groups = input.interpretations.value.groups;
    bundle.accounts = input.interpretations.value.accounts;
  } else {
    errors.interpretations = input.interpretations.error;
  }

  if (input.claims.ok) {
    bundle.claims = input.claims.value;
  } else {
    errors.claims = input.claims.error;
  }

  return { bundle, errors };
}
