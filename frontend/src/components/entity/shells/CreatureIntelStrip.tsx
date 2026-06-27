import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import {
  Flame,
  MapPin,
  Moon,
  Shield,
  ShieldAlert,
  Skull,
  Snowflake,
  Swords,
  Users,
} from 'lucide-react';
import type { BestiaryIntelProjection } from '@/lib/bestiaryIdentityProjection';
import { maskIntelValue } from '@/lib/bestiaryIdentityProjection';

interface IntelChipProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

function IntelChip({ label, value, icon }: IntelChipProps) {
  return (
    <div className="flex min-w-[7rem] shrink-0 flex-col gap-1 rounded-lg border border-border/50 bg-surface/40 px-3 py-2 transition-colors hover:border-primary/30 hover:bg-surface/60">
      <span className={META_SECTION_LABEL_CLASS}>
        {label}
      </span>
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {icon}
        <span className="break-words">{value}</span>
      </span>
    </div>
  );
}

interface CreatureIntelStripProps {
  intel: BestiaryIntelProjection;
}

export function CreatureIntelStrip({ intel }: CreatureIntelStripProps) {
  const chips: IntelChipProps[] = [];

  const regionValue = maskIntelValue(
    intel.discoveryMask.region,
    intel.region ?? intel.habitat,
  );
  if (regionValue) {
    chips.push({
      label: 'Region',
      value: regionValue,
      icon: <MapPin className="size-3.5 shrink-0 text-primary/80" aria-hidden />,
    });
  }

  const encounterValue = maskIntelValue(
    intel.discoveryMask.encounter,
    intel.encounterConditions,
  );
  if (encounterValue) {
    chips.push({
      label: 'Encountered',
      value: encounterValue,
      icon: <Moon className="size-3.5 shrink-0 text-primary/80" aria-hidden />,
    });
  }

  const threatValue = maskIntelValue(intel.discoveryMask.threat, intel.threatLevel);
  if (threatValue) {
    chips.push({
      label: 'Threat',
      value: threatValue,
      icon: <Skull className="size-3.5 shrink-0 text-amber-500/90" aria-hidden />,
    });
  }

  const temperamentValue = maskIntelValue(intel.discoveryMask.temperament, intel.temperament);
  if (temperamentValue) {
    chips.push({
      label: 'Behavior',
      value: temperamentValue,
      icon: <Users className="size-3.5 shrink-0 text-primary/80" aria-hidden />,
    });
  }

  const weaknessValue = maskIntelValue(intel.discoveryMask.weaknesses, intel.weaknesses);
  if (weaknessValue) {
    chips.push({
      label: 'Weak To',
      value: weaknessValue,
      icon: <Flame className="size-3.5 shrink-0 text-orange-500/90" aria-hidden />,
    });
  }

  const resistValue = maskIntelValue(intel.discoveryMask.resistances, intel.resistances);
  if (resistValue) {
    chips.push({
      label: 'Resists',
      value: resistValue,
      icon: <Snowflake className="size-3.5 shrink-0 text-sky-400/90" aria-hidden />,
    });
  }

  const immuneValue = maskIntelValue(intel.discoveryMask.immunities, intel.immunities);
  if (immuneValue) {
    chips.push({
      label: 'Immune',
      value: immuneValue,
      icon: <Shield className="size-3.5 shrink-0 text-emerald-500/90" aria-hidden />,
    });
  }

  const activeValue = maskIntelValue(intel.discoveryMask.activePeriods, intel.activePeriods);
  if (activeValue) {
    chips.push({
      label: 'Active',
      value: activeValue,
      icon: <Moon className="size-3.5 shrink-0 text-primary/80" aria-hidden />,
    });
  }

  const factionValue = maskIntelValue(intel.discoveryMask.faction, intel.factionAlignment);
  if (factionValue) {
    chips.push({
      label: 'Faction',
      value: factionValue,
      icon: <Swords className="size-3.5 shrink-0 text-primary/80" aria-hidden />,
    });
  }

  const corruptionValue = maskIntelValue(
    intel.discoveryMask.corruption,
    intel.corruptionAffinity,
  );
  if (corruptionValue) {
    chips.push({
      label: 'Corruption',
      value: corruptionValue,
      icon: <ShieldAlert className="size-3.5 shrink-0 text-purple-500/90" aria-hidden />,
    });
  }

  if (chips.length === 0) return null;

  return (
    <section className="mb-4 -mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex min-w-min gap-2">
        {chips.map((chip) => (
          <IntelChip key={chip.label} {...chip} />
        ))}
      </div>
    </section>
  );
}
