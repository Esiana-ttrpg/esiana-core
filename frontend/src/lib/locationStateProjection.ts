export type LocationPulseSignalKey =
  | 'population'
  | 'economy'
  | 'security'
  | 'politicalStability'
  | 'militaryPresence'
  | 'publicSentiment';

export type LocationPulseTrend = 'improving' | 'stable' | 'worsening';

export interface LocationPulseEvidenceLink {
  pageId: string;
  label: string;
  kind: 'event' | 'development' | 'quest' | 'faction' | 'other';
}

export interface LocationPulseSignal {
  key: LocationPulseSignalKey;
  trend: LocationPulseTrend;
  summary: string;
  evidence: LocationPulseEvidenceLink[];
  overrideText?: string | null;
}

export interface LocationStateProjection {
  signals: LocationPulseSignal[];
  derivedAt: string | null;
}

/** V1 stub — full derivation from world systems is a future pass. */
export function buildLocationStateProjection(): LocationStateProjection {
  return {
    signals: [],
    derivedAt: null,
  };
}

export function formatLocationPulseSignalLabel(key: LocationPulseSignalKey): string {
  switch (key) {
    case 'population':
      return 'Population';
    case 'economy':
      return 'Economy';
    case 'security':
      return 'Security';
    case 'politicalStability':
      return 'Political stability';
    case 'militaryPresence':
      return 'Military presence';
    case 'publicSentiment':
      return 'Public sentiment';
    default:
      return key;
  }
}
