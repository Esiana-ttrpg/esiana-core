import type {
  DevelopmentType,
  DevelopmentTypeLifecycle,
  WorldDevelopmentSettings,
} from '@shared/worldDevelopmentMetadata';
import {
  DEFAULT_TYPE_LIFECYCLES,
  WORLD_DEVELOPMENT_MODES,
} from '@shared/worldDevelopmentMetadata';
import {
  campaignBudgetForActivityTier,
  DEVELOPMENT_TYPE_LABELS,
  developmentTypesBySignificance,
  formatDevelopmentDuration,
  WORLD_ACTIVITY_DESCRIPTIONS,
  WORLD_ACTIVITY_LABELS,
  WORLD_ACTIVITY_TIERS,
  WORLD_DEVELOPMENT_MODE_DESCRIPTIONS,
  WORLD_DEVELOPMENT_MODE_HEADLINES,
  worldActivityTierForBudget,
  type WorldActivityTier,
} from '@shared/worldDevelopmentPresentation';
import type { WorldDevelopmentSourceSignalsSummary } from '@shared/worldDevelopmentPresentation';
import { controlClasses } from '@/components/ui/formStyles';

const CAMPAIGN_MONTH_MINUTES = 30 * 24 * 60;
const CAMPAIGN_WEEK_MINUTES = 7 * 24 * 60;
const CAMPAIGN_DAY_MINUTES = 24 * 60;

type DurationUnit = 'days' | 'weeks' | 'months';

function minutesFromValueUnit(value: number, unit: DurationUnit): number {
  if (unit === 'months') return value * CAMPAIGN_MONTH_MINUTES;
  if (unit === 'weeks') return value * CAMPAIGN_WEEK_MINUTES;
  return value * CAMPAIGN_DAY_MINUTES;
}

function valueUnitFromMinutes(minutes: number): { value: number; unit: DurationUnit } {
  if (minutes > 0 && minutes % CAMPAIGN_MONTH_MINUTES === 0) {
    return { value: minutes / CAMPAIGN_MONTH_MINUTES, unit: 'months' };
  }
  if (minutes > 0 && minutes % CAMPAIGN_WEEK_MINUTES === 0) {
    return { value: minutes / CAMPAIGN_WEEK_MINUTES, unit: 'weeks' };
  }
  return { value: Math.max(0, Math.round(minutes / CAMPAIGN_DAY_MINUTES)), unit: 'days' };
}

function DurationField({
  label,
  minutes,
  onChange,
  disabled,
}: {
  label: string;
  minutes: number;
  onChange: (minutes: number) => void;
  disabled?: boolean;
}) {
  const parsed = valueUnitFromMinutes(minutes);
  return (
    <label className="block space-y-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          disabled={disabled}
          value={parsed.value}
          onChange={(e) => {
            const value = Number(e.target.value);
            onChange(minutesFromValueUnit(Number.isFinite(value) ? value : 0, parsed.unit));
          }}
          className={`${controlClasses} w-20`}
        />
        <select
          disabled={disabled}
          value={parsed.unit}
          onChange={(e) => {
            onChange(minutesFromValueUnit(parsed.value, e.target.value as DurationUnit));
          }}
          className={`${controlClasses} flex-1`}
        >
          <option value="days">Days</option>
          <option value="weeks">Weeks</option>
          <option value="months">Campaign months</option>
        </select>
      </div>
      <span className="text-[10px] text-muted-foreground">{formatDevelopmentDuration(minutes)}</span>
    </label>
  );
}

function TypeLifecycleGroup({
  title,
  types,
  lifecycles,
  onChange,
  disabled,
}: {
  title: string;
  types: DevelopmentType[];
  lifecycles: Record<DevelopmentType, DevelopmentTypeLifecycle>;
  onChange: (type: DevelopmentType, patch: Partial<DevelopmentTypeLifecycle>) => void;
  disabled?: boolean;
}) {
  return (
    <details className="rounded-md border border-border/60 bg-background/30">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-foreground">
        {title} ({types.length} types)
      </summary>
      <ul className="space-y-3 border-t border-border/50 px-3 py-3">
        {types.map((type) => {
          const lifecycle = lifecycles[type];
          return (
            <li key={type} className="space-y-2 rounded border border-border/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {DEVELOPMENT_TYPE_LABELS[type]}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  className="text-[10px] text-primary hover:underline disabled:opacity-50"
                  onClick={() => onChange(type, DEFAULT_TYPE_LIFECYCLES[type])}
                >
                  Reset defaults
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DurationField
                  label="Preparation window"
                  minutes={lifecycle.prepMinutes}
                  disabled={disabled}
                  onChange={(prepMinutes) => onChange(type, { prepMinutes })}
                />
                <DurationField
                  label="Cooldown"
                  minutes={lifecycle.cooldownMinutes}
                  disabled={disabled}
                  onChange={(cooldownMinutes) => onChange(type, { cooldownMinutes })}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export interface WorldDevelopmentSettingsFormProps {
  settings: WorldDevelopmentSettings;
  sourceSignals: WorldDevelopmentSourceSignalsSummary | null;
  saving: boolean;
  onChange: (patch: Partial<WorldDevelopmentSettings>) => void;
  onSave: () => void;
}

export function WorldDevelopmentSettingsForm({
  settings,
  sourceSignals,
  saving,
  onChange,
  onSave,
}: WorldDevelopmentSettingsFormProps) {
  const activityTier = worldActivityTierForBudget(settings.campaignMonthlyBudget);
  const minorTypes = developmentTypesBySignificance('minor');
  const significantTypes = developmentTypesBySignificance('significant');

  function setActivityTier(tier: WorldActivityTier) {
    onChange({
      campaignMonthlyBudget: campaignBudgetForActivityTier(tier),
    });
  }

  function updateTypeLifecycle(type: DevelopmentType, patch: Partial<DevelopmentTypeLifecycle>) {
    onChange({
      typeLifecycles: {
        ...settings.typeLifecycles,
        [type]: { ...settings.typeLifecycles[type], ...patch },
      },
    });
  }

  function resetAllTypeLifecycles() {
    onChange({ typeLifecycles: { ...DEFAULT_TYPE_LIFECYCLES } });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
      className="space-y-8"
    >
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Mode</h3>
        <p className="text-xs text-muted-foreground">
          Choose how suggestions enter your campaign. Off is the default.
        </p>
        <div className="space-y-2">
          {WORLD_DEVELOPMENT_MODES.map((mode) => (
            <label
              key={mode}
              className={`flex cursor-pointer gap-3 rounded-md border px-3 py-2 ${
                settings.mode === mode ? 'border-primary/50 bg-primary/5' : 'border-border'
              }`}
            >
              <input
                type="radio"
                name="world-dev-mode"
                checked={settings.mode === mode}
                disabled={saving}
                onChange={() => onChange({ mode })}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {WORLD_DEVELOPMENT_MODE_HEADLINES[mode]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {WORLD_DEVELOPMENT_MODE_DESCRIPTIONS[mode]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">World Activity</h3>
        <p className="text-xs text-muted-foreground">
          How much living-world change this campaign generates over time.
        </p>
        <div className="space-y-2">
          {WORLD_ACTIVITY_TIERS.map((tier) => (
            <label
              key={tier}
              className={`flex cursor-pointer gap-3 rounded-md border px-3 py-2 ${
                activityTier === tier ? 'border-primary/50 bg-primary/5' : 'border-border'
              }`}
            >
              <input
                type="radio"
                name="world-activity"
                checked={activityTier === tier}
                disabled={saving}
                onChange={() => setActivityTier(tier)}
                className="mt-1"
              />
              <span className="text-sm text-foreground">{WORLD_ACTIVITY_LABELS[tier]}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {WORLD_ACTIVITY_LABELS[activityTier]} —{' '}
          {activityTier === 'custom'
            ? 'Set a custom range for developments per campaign month.'
            : WORLD_ACTIVITY_DESCRIPTIONS[activityTier]}
        </p>
        {activityTier === 'custom' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Minimum per campaign month</span>
              <input
                type="number"
                min={0}
                disabled={saving}
                value={settings.monthlyBudgetMin ?? 1}
                onChange={(e) =>
                  onChange({ monthlyBudgetMin: Math.max(0, Number(e.target.value) || 0) })
                }
                className={controlClasses}
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Maximum per campaign month</span>
              <input
                type="number"
                min={1}
                disabled={saving}
                value={settings.monthlyBudgetMax ?? 12}
                onChange={(e) =>
                  onChange({ monthlyBudgetMax: Math.max(1, Number(e.target.value) || 1) })
                }
                className={controlClasses}
              />
            </label>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Development types</h3>
          <button
            type="button"
            disabled={saving}
            onClick={resetAllTypeLifecycles}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            Reset all to defaults
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Preparation windows and cooldowns per development type. Expand a group to edit.
        </p>
        <div className="space-y-2">
          <TypeLifecycleGroup
            title="Minor developments"
            types={minorTypes}
            lifecycles={settings.typeLifecycles}
            disabled={saving}
            onChange={updateTypeLifecycle}
          />
          <TypeLifecycleGroup
            title="Significant developments"
            types={significantTypes}
            lifecycles={settings.typeLifecycles}
            disabled={saving}
            onChange={updateTypeLifecycle}
          />
        </div>
      </section>

      {sourceSignals ? (
        <section className="space-y-3 rounded-md border border-border/60 bg-background/30 p-4">
          <h3 className="text-sm font-semibold text-foreground">Source signals</h3>
          <p className="text-xs text-muted-foreground">
            World Development currently uses:
          </p>
          <ul className="space-y-1 text-sm text-foreground">
            <li>✓ Faction trajectories</li>
            <li>✓ Organization world states</li>
            <li>
              {sourceSignals.usesScheduledEffects ? '✓' : '○'} Scheduled effects
              {sourceSignals.scheduledEffectsActiveCount > 0
                ? ` (${sourceSignals.scheduledEffectsActiveCount} active)`
                : ''}
            </li>
            <li>{sourceSignals.usesCampaignTime ? '✓' : '○'} Campaign time</li>
            <li>✓ World pressure projection</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            {sourceSignals.factionsWithSignalsCount} of {sourceSignals.activeFactionCount} active
            factions contribute signals.
            {sourceSignals.factionsMissingTrajectoryCount > 0
              ? ` ${sourceSignals.factionsMissingTrajectoryCount} have no trajectory data.`
              : ''}
          </p>
        </section>
      ) : null}

      <details className="rounded-md border border-border/60">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-foreground">
          Advanced options
        </summary>
        <div className="space-y-4 border-t border-border/50 px-3 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Expire pending after (wall-clock days)</span>
              <input
                type="number"
                min={1}
                disabled={saving}
                value={settings.expiration.wallClockDays}
                onChange={(e) =>
                  onChange({
                    expiration: {
                      ...settings.expiration,
                      wallClockDays: Math.max(1, Number(e.target.value) || 1),
                    },
                  })
                }
                className={controlClasses}
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="text-muted-foreground">Max advance cycles before stale</span>
              <input
                type="number"
                min={1}
                disabled={saving}
                value={settings.expiration.maxAdvanceCycles}
                onChange={(e) =>
                  onChange({
                    expiration: {
                      ...settings.expiration,
                      maxAdvanceCycles: Math.max(1, Number(e.target.value) || 1),
                    },
                  })
                }
                className={controlClasses}
              />
            </label>
          </div>
          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">Max per faction per quarter (optional)</span>
            <input
              type="number"
              min={1}
              disabled={saving}
              value={settings.maxPerFactionPerQuarter ?? ''}
              placeholder="No limit"
              onChange={(e) => {
                const raw = e.target.value.trim();
                onChange({
                  maxPerFactionPerQuarter: raw === '' ? undefined : Math.max(1, Number(raw) || 1),
                });
              }}
              className={controlClasses}
            />
          </label>
        </div>
      </details>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-background hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
