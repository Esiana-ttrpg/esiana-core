import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useState } from 'react';
import type { AppearanceDetailsFields } from '@shared/appearanceMetadata';
import type { AppearanceDetailsViewModel } from '@/lib/entityAppearanceProjection';
import { getAppearanceFieldGuidance } from '@/lib/appearanceFieldGuidance';
import { AppearanceFieldLabel } from './AppearanceFieldLabel';
import {
  EntityFactReadValue,
  EntityFactRow,
  EntityFactRowList,
} from '@/components/entity/shells/EntityFactRow';
import {
  appearanceFieldClass,
  formatCommaList,
  parseCommaList,
  parseCommaListDraft,
  SectionLabel,
} from './appearanceShared';

function joinList(items: string[]): string {
  return items.map((item) => item.trim()).filter(Boolean).join(', ');
}

/** Compact wiki fact rows for appearance read — omits empty fields. */
export function AppearanceDetailsFactRows({
  details,
}: {
  details: AppearanceDetailsViewModel;
}) {
  const features = joinList(details.distinguishingFeatures);
  const injuries = joinList(details.visibleInjuries);

  return (
    <EntityFactRowList>
      {details.atAGlance?.trim() ? (
        <EntityFactRow label="At a glance">
          <span className="font-normal">{details.atAGlance.trim()}</span>
        </EntityFactRow>
      ) : null}
      {details.build?.trim() ? (
        <EntityFactRow label="Build">
          <EntityFactReadValue value={details.build} />
        </EntityFactRow>
      ) : null}
      {details.voice?.trim() ? (
        <EntityFactRow label="Voice">
          <EntityFactReadValue value={details.voice} />
        </EntityFactRow>
      ) : null}
      {details.vibeImpression?.trim() ? (
        <EntityFactRow label="Presence">
          <EntityFactReadValue value={details.vibeImpression} />
        </EntityFactRow>
      ) : null}
      {details.clothingMotifs?.trim() ? (
        <EntityFactRow label="Clothing motifs">
          <EntityFactReadValue value={details.clothingMotifs} />
        </EntityFactRow>
      ) : null}
      {features ? (
        <EntityFactRow label="Distinguishing features">
          <span>{features}</span>
        </EntityFactRow>
      ) : null}
      {injuries ? (
        <EntityFactRow label="Visible injuries">
          <span>{injuries}</span>
        </EntityFactRow>
      ) : null}
    </EntityFactRowList>
  );
}

interface AppearanceDetailsReadProps {
  details: AppearanceDetailsViewModel;
  compact?: boolean;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <span className="text-xs text-muted">{label}</span>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="list-inside list-disc space-y-0.5 text-sm text-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function AppearanceDetailsReadView({
  details,
  compact = false,
}: AppearanceDetailsReadProps) {
  if (!details.hasContent) return null;

  const gridClass = compact ? 'grid gap-2' : 'grid gap-3 sm:grid-cols-3';

  return (
    <section className="space-y-3">
      <SectionLabel>Details</SectionLabel>

      {details.atAGlance ? (
        <div className="space-y-1">
          <span className="text-xs text-muted">At a glance</span>
          <p className="wiki-reader-prose text-sm leading-relaxed text-foreground">
            {details.atAGlance}
          </p>
        </div>
      ) : null}

      <div className={gridClass}>
        {details.build ? <DetailItem label="Build" value={details.build} /> : null}
        {details.voice ? <DetailItem label="Voice" value={details.voice} /> : null}
        {details.vibeImpression ? (
          <DetailItem label="Impression" value={details.vibeImpression} />
        ) : null}
      </div>

      {details.clothingMotifs ? (
        <DetailItem label="Clothing motifs" value={details.clothingMotifs} />
      ) : null}

      {details.distinguishingFeatures.length > 0 ? (
        <div className="space-y-1">
          <span className="text-xs text-muted">Distinguishing features</span>
          <BulletList items={details.distinguishingFeatures} />
        </div>
      ) : null}

      {details.visibleInjuries.length > 0 ? (
        <div className="space-y-1">
          <span className="text-xs text-muted">Visible injuries</span>
          <BulletList items={details.visibleInjuries} />
        </div>
      ) : null}
    </section>
  );
}

interface AppearanceDetailsEditorProps {
  details: AppearanceDetailsFields;
  onChange: (details: AppearanceDetailsFields) => void;
  onPersist: (patch: Partial<AppearanceDetailsFields>) => void;
}

export function AppearanceDetailsEditor({
  details,
  onChange,
  onPersist,
}: AppearanceDetailsEditorProps) {
  const [featuresInput, setFeaturesInput] = useState(
    formatCommaList(details.distinguishingFeatures),
  );
  const [injuriesInput, setInjuriesInput] = useState(formatCommaList(details.visibleInjuries));

  return (
    <div className="grid gap-3">
      <div className="space-y-1">
        <AppearanceFieldLabel
          label="At a glance"
          htmlFor="appearance.atAGlance"
          guidance={getAppearanceFieldGuidance('atAGlance')}
        />
        <textarea
          id="appearance.atAGlance"
          className={`${appearanceFieldClass} min-h-[4rem] resize-y`}
          placeholder="Optional snapshot…"
          value={details.atAGlance ?? ''}
          onChange={(e) =>
            onChange({ ...details, atAGlance: e.target.value || null })
          }
          onBlur={() => onPersist({ atAGlance: details.atAGlance?.trim() || null })}
          rows={3}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <AppearanceFieldLabel
            label="Build"
            htmlFor="appearance.build"
            guidance={getAppearanceFieldGuidance('build')}
          />
          <input
            id="appearance.build"
            className={appearanceFieldClass}
            placeholder="Optional"
            value={details.build ?? ''}
            onChange={(e) => onChange({ ...details, build: e.target.value || null })}
            onBlur={() => onPersist({ build: details.build?.trim() || null })}
          />
        </div>
        <div className="space-y-1">
          <AppearanceFieldLabel
            label="Voice"
            htmlFor="appearance.voice"
            guidance={getAppearanceFieldGuidance('voice')}
          />
          <input
            id="appearance.voice"
            className={appearanceFieldClass}
            placeholder="Optional"
            value={details.voice ?? ''}
            onChange={(e) => onChange({ ...details, voice: e.target.value || null })}
            onBlur={() => onPersist({ voice: details.voice?.trim() || null })}
          />
        </div>
      </div>

      <div className="space-y-1">
        <AppearanceFieldLabel
          label="Presence"
          htmlFor="appearance.vibeImpression"
          guidance={getAppearanceFieldGuidance('presence')}
        />
        <input
          id="appearance.vibeImpression"
          className={appearanceFieldClass}
          placeholder="Optional"
          value={details.vibeImpression ?? ''}
          onChange={(e) =>
            onChange({ ...details, vibeImpression: e.target.value || null })
          }
          onBlur={() => onPersist({ vibeImpression: details.vibeImpression?.trim() || null })}
        />
      </div>

      <div className="space-y-1">
        <AppearanceFieldLabel
          label="Clothing motifs"
          htmlFor="appearance.clothingMotifs"
          guidance={getAppearanceFieldGuidance('clothingMotifs')}
        />
        <input
          id="appearance.clothingMotifs"
          className={appearanceFieldClass}
          placeholder="Optional"
          value={details.clothingMotifs ?? ''}
          onChange={(e) =>
            onChange({ ...details, clothingMotifs: e.target.value || null })
          }
          onBlur={() => onPersist({ clothingMotifs: details.clothingMotifs?.trim() || null })}
        />
      </div>

      <div className="space-y-1">
        <AppearanceFieldLabel
          label="Distinguishing features"
          htmlFor="appearance.distinguishingFeatures"
          guidance={getAppearanceFieldGuidance('distinguishingFeatures')}
        />
        <input
          id="appearance.distinguishingFeatures"
          className={appearanceFieldClass}
          placeholder="Comma-separated"
          value={featuresInput}
          onChange={(e) => {
            setFeaturesInput(e.target.value);
            onChange({
              ...details,
              distinguishingFeatures: parseCommaListDraft(e.target.value),
            });
          }}
          onBlur={() => {
            const normalized = parseCommaList(featuresInput);
            setFeaturesInput(formatCommaList(normalized));
            onChange({ ...details, distinguishingFeatures: normalized });
            onPersist({ distinguishingFeatures: normalized });
          }}
        />
      </div>

      <div className="space-y-1">
        <AppearanceFieldLabel
          label="Visible injuries"
          htmlFor="appearance.visibleInjuries"
          guidance={getAppearanceFieldGuidance('visibleInjuries')}
        />
        <input
          id="appearance.visibleInjuries"
          className={appearanceFieldClass}
          placeholder="Comma-separated"
          value={injuriesInput}
          onChange={(e) => {
            setInjuriesInput(e.target.value);
            onChange({
              ...details,
              visibleInjuries: parseCommaListDraft(e.target.value),
            });
          }}
          onBlur={() => {
            const normalized = parseCommaList(injuriesInput);
            setInjuriesInput(formatCommaList(normalized));
            onChange({ ...details, visibleInjuries: normalized });
            onPersist({ visibleInjuries: normalized });
          }}
        />
      </div>
    </div>
  );
}

interface AppearanceDetailsWidgetProps {
  mode: 'read' | 'edit';
  details: AppearanceDetailsViewModel | AppearanceDetailsFields;
  onChange?: (details: AppearanceDetailsFields) => void;
  onPersist?: (patch: Partial<AppearanceDetailsFields>) => void;
  compact?: boolean;
}

export function AppearanceDetailsWidget({
  mode,
  details,
  onChange,
  onPersist,
  compact,
}: AppearanceDetailsWidgetProps) {
  const viewModel: AppearanceDetailsViewModel =
    'hasContent' in details
      ? details
      : {
          ...details,
          hasContent: Boolean(
            details.build ||
              details.voice ||
              details.clothingMotifs ||
              details.vibeImpression ||
              details.atAGlance ||
              details.distinguishingFeatures.length > 0 ||
              details.visibleInjuries.length > 0,
          ),
          formattedSummary: '',
        };

  if (mode === 'read') {
    return <AppearanceDetailsReadView details={viewModel} compact={compact} />;
  }

  if (!onChange || !onPersist) return null;

  const fields: AppearanceDetailsFields = {
    build: viewModel.build,
    voice: viewModel.voice,
    distinguishingFeatures: viewModel.distinguishingFeatures,
    clothingMotifs: viewModel.clothingMotifs,
    visibleInjuries: viewModel.visibleInjuries,
    vibeImpression: viewModel.vibeImpression,
    atAGlance: viewModel.atAGlance,
  };

  return (
    <AppearanceDetailsEditor details={fields} onChange={onChange} onPersist={onPersist} />
  );
}
