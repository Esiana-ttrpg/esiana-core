/**
 * Core World Development definitions — setting-agnostic event templates.
 */
import type { FactionMomentumState } from './factionMomentumMetadata.js';
import type {
  DevelopmentAcceptTarget,
  DevelopmentSignificance,
  DevelopmentType,
  DevelopmentTypeLifecycle,
} from './worldDevelopmentMetadata.js';
import { DEFAULT_TYPE_LIFECYCLES } from './worldDevelopmentMetadata.js';

export type DevelopmentDefinitionSource =
  | { kind: 'core' }
  | { kind: 'plugin'; pluginId: string };

export type DevelopmentDefinition = {
  id: string;
  /** Maps to DevelopmentType for payload / lifecycle settings. */
  developmentType: DevelopmentType;
  label: string;
  significance: DevelopmentSignificance;
  applicableMomentumStates: FactionMomentumState[];
  defaultLifecycle: DevelopmentTypeLifecycle;
  acceptTarget: DevelopmentAcceptTarget;
  tags?: string[];
  source: DevelopmentDefinitionSource;
};

function coreDef(
  developmentType: DevelopmentType,
  label: string,
  applicableMomentumStates: FactionMomentumState[],
  acceptTarget: DevelopmentAcceptTarget,
  tags: string[],
): DevelopmentDefinition {
  const lifecycle = DEFAULT_TYPE_LIFECYCLES[developmentType];
  return {
    id: developmentType,
    developmentType,
    label,
    significance: lifecycle.significance,
    applicableMomentumStates,
    defaultLifecycle: lifecycle,
    acceptTarget,
    tags,
    source: { kind: 'core' },
  };
}

export const CORE_DEVELOPMENT_DEFINITIONS: DevelopmentDefinition[] = [
  coreDef(
    'trade_expansion',
    'Trade Expansion',
    ['rising', 'expanding', 'resurgent'],
    'calendar_event',
    ['economic'],
  ),
  coreDef(
    'diplomatic_overture',
    'Diplomatic Overture',
    ['rising', 'stable', 'resurgent'],
    'calendar_event',
    ['diplomatic'],
  ),
  coreDef(
    'territorial_claim',
    'Territorial Claim',
    ['rising', 'expanding'],
    'calendar_event',
    ['military'],
  ),
  coreDef(
    'merchant_dispute',
    'Merchant Dispute',
    ['rising', 'fragmenting'],
    'calendar_event',
    ['economic'],
  ),
  coreDef(
    'border_incident',
    'Border Incident',
    ['fragmenting', 'desperate', 'declining'],
    'calendar_event',
    ['military'],
  ),
  coreDef(
    'merchant_unrest',
    'Merchant Unrest',
    ['declining', 'fragmenting'],
    'calendar_event',
    ['economic'],
  ),
  coreDef(
    'leadership_challenge',
    'Leadership Challenge',
    ['fragmenting', 'desperate'],
    'calendar_event',
    ['political'],
  ),
  coreDef(
    'succession_crisis',
    'Succession Crisis',
    ['declining', 'desperate', 'dormant'],
    'calendar_event',
    ['political'],
  ),
  coreDef(
    'alliance_proposal',
    'Alliance Proposal',
    ['rising', 'stable'],
    'calendar_event',
    ['diplomatic'],
  ),
  coreDef(
    'regional_instability',
    'Regional Instability',
    ['fragmenting', 'desperate'],
    'calendar_event',
    ['regional'],
  ),
];

export function findCoreDefinitionById(id: string): DevelopmentDefinition | undefined {
  return CORE_DEVELOPMENT_DEFINITIONS.find((d) => d.id === id);
}

export function findDefinitionForDevelopmentType(
  developmentType: DevelopmentType,
): DevelopmentDefinition | undefined {
  return CORE_DEVELOPMENT_DEFINITIONS.find((d) => d.developmentType === developmentType);
}
