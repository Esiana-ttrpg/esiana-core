import type { DevelopmentDefinition } from '../../../shared/coreDevelopmentDefinitions.js';
import { coreDevelopmentProvider } from './coreDevelopmentProvider.js';
import type {
  DevelopmentCandidate,
  DevelopmentProvider,
  DevelopmentResolveProvider,
  EligibilityProvider,
  RationaleProvider,
  WorldDevelopmentContext,
} from '../../../shared/developmentProvider.js';
import type { DevelopmentRationaleLine } from '../../../shared/worldDevelopmentMetadata.js';
import { deriveConfidenceFromRationale } from '../../../shared/worldDevelopmentMetadata.js';

const providers = new Map<string, DevelopmentProvider>();
const eligibilityProviders = new Map<string, EligibilityProvider>();
const rationaleProviders = new Map<string, RationaleProvider>();
const resolveProviders = new Map<string, DevelopmentResolveProvider>();

/** Plugin ids that registered a development provider (for campaign gating). */
const pluginProviderIds = new Set<string>();

export function clearDevelopmentRegistry(): void {
  providers.clear();
  eligibilityProviders.clear();
  rationaleProviders.clear();
  resolveProviders.clear();
  pluginProviderIds.clear();
}

export function registerDevelopmentProvider(provider: DevelopmentProvider): void {
  if (provider.id !== 'core') {
    pluginProviderIds.add(provider.id);
  }
  providers.set(provider.id, provider);
}

export function registerEligibilityProvider(provider: EligibilityProvider): void {
  eligibilityProviders.set(provider.definitionId, provider);
}

export function registerRationaleProvider(provider: RationaleProvider): void {
  rationaleProviders.set(provider.definitionId, provider);
}

export function registerDevelopmentResolveProvider(provider: DevelopmentResolveProvider): void {
  resolveProviders.set(provider.definitionId, provider);
}

export function getDevelopmentResolveProvider(
  definitionId: string,
): DevelopmentResolveProvider | undefined {
  return resolveProviders.get(definitionId);
}

export function listRegisteredProviderIds(): string[] {
  return [...providers.keys()];
}

export function listAllDefinitions(): DevelopmentDefinition[] {
  const defs: DevelopmentDefinition[] = [];
  for (const provider of providers.values()) {
    defs.push(...provider.developmentDefinitions());
  }
  return defs;
}

export function listDefinitionsForCampaign(_campaignId: string): DevelopmentDefinition[] {
  // Plugin gating for candidate generation happens in resolveCandidatesForCampaign.
  return listAllDefinitions();
}

export function findDefinitionById(definitionId: string): DevelopmentDefinition | undefined {
  for (const provider of providers.values()) {
    const match = provider.developmentDefinitions().find((d) => d.id === definitionId);
    if (match) return match;
  }
  return undefined;
}

async function applyEligibilityFilter(
  campaignId: string,
  candidates: DevelopmentCandidate[],
  context: WorldDevelopmentContext,
): Promise<DevelopmentCandidate[]> {
  const filtered: DevelopmentCandidate[] = [];
  for (const candidate of candidates) {
    const eligibility = eligibilityProviders.get(candidate.definitionId);
    if (!eligibility) {
      filtered.push(candidate);
      continue;
    }
    const faction =
      candidate.primaryOrgPageId != null
        ? context.projectedFactionStates.find((f) => f.orgPageId === candidate.primaryOrgPageId) ??
          null
        : null;
    const allowed = await eligibility.isEligible({
      campaignId,
      definitionId: candidate.definitionId,
      candidate,
      faction,
    });
    if (allowed) filtered.push(candidate);
  }
  return filtered;
}

function applyRationaleAppend(
  campaignId: string,
  candidates: DevelopmentCandidate[],
  context: WorldDevelopmentContext,
): DevelopmentCandidate[] {
  return candidates.map((candidate) => {
    const rationaleProvider = rationaleProviders.get(candidate.definitionId);
    if (!rationaleProvider) return candidate;
    const faction =
      candidate.primaryOrgPageId != null
        ? context.projectedFactionStates.find((f) => f.orgPageId === candidate.primaryOrgPageId) ??
          null
        : null;
    const appended = rationaleProvider.appendRationale({
      campaignId,
      definitionId: candidate.definitionId,
      candidate,
      faction,
      baseRationale: candidate.rationale,
    });
    const rationale = [...candidate.rationale, ...appended];
    return { ...candidate, rationale };
  });
}

export async function resolveCandidatesForCampaign(
  campaignId: string,
  context: WorldDevelopmentContext,
  options?: { enabledPluginIds?: Set<string> },
): Promise<DevelopmentCandidate[]> {
  const enabledPlugins = options?.enabledPluginIds;
  const raw: DevelopmentCandidate[] = [];

  for (const [providerId, provider] of providers) {
    if (providerId !== 'core') {
      if (enabledPlugins && !enabledPlugins.has(providerId)) continue;
    }
    const generated = provider.generateCandidates(context);
    raw.push(...generated);
  }

  const deduped = dedupeCandidates(raw);
  const eligible = await applyEligibilityFilter(campaignId, deduped, context);
  return applyRationaleAppend(campaignId, eligible, context);
}

function dedupeCandidates(candidates: DevelopmentCandidate[]): DevelopmentCandidate[] {
  const seen = new Set<string>();
  const out: DevelopmentCandidate[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.idempotencyKey)) continue;
    seen.add(candidate.idempotencyKey);
    out.push(candidate);
  }
  return out;
}

export function appendBudgetRationale(
  rationale: DevelopmentRationaleLine[],
  rank: number,
  totalSlots: number,
): DevelopmentRationaleLine[] {
  return [
    ...rationale,
    {
      kind: 'budget',
      text: `Campaign budget slot ${rank} of ${totalSlots}`,
    },
  ];
}

export function initializeDevelopmentRegistry(): void {
  clearDevelopmentRegistry();
  registerDevelopmentProvider(coreDevelopmentProvider);
}
