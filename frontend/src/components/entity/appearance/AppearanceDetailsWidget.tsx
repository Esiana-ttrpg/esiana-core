import { useState } from 'react';
import type { AppearanceDetailsFields } from '@shared/appearanceMetadata';
import type { AppearanceDetailsViewModel } from '@/lib/entityAppearanceProjection';
import {
  appearanceFieldClass,
  formatCommaList,
  parseCommaList,
  parseCommaListDraft,
  SectionLabel,
} from './appearanceShared';

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
        <SectionLabel>Details</SectionLabel>
        <p className="text-[10px] text-muted">
          Baseline characterization — form-specific shifts belong in a Form&apos;s presentation
          notes.
        </p>
      </div>

      <label className="space-y-1" id="appearance.atAGlance">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
          At a glance
        </span>
        <textarea
          className={`${appearanceFieldClass} min-h-[4rem] resize-y`}
          placeholder="Tall and composed, dressed in layered charcoal fabrics…"
          value={details.atAGlance ?? ''}
          onChange={(e) =>
            onChange({ ...details, atAGlance: e.target.value || null })
          }
          onBlur={() => onPersist({ atAGlance: details.atAGlance?.trim() || null })}
          rows={3}
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1" id="appearance.build">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Build
          </span>
          <input
            className={appearanceFieldClass}
            placeholder="Lean, broad-shouldered…"
            value={details.build ?? ''}
            onChange={(e) => onChange({ ...details, build: e.target.value || null })}
            onBlur={() => onPersist({ build: details.build?.trim() || null })}
          />
        </label>
        <label className="space-y-1" id="appearance.voice">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Voice
          </span>
          <input
            className={appearanceFieldClass}
            placeholder="Soft, deliberate…"
            value={details.voice ?? ''}
            onChange={(e) => onChange({ ...details, voice: e.target.value || null })}
            onBlur={() => onPersist({ voice: details.voice?.trim() || null })}
          />
        </label>
      </div>

      <label className="space-y-1" id="appearance.vibeImpression">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
          Vibe / impression
        </span>
        <input
          className={appearanceFieldClass}
          placeholder="Radiates calm authority…"
          value={details.vibeImpression ?? ''}
          onChange={(e) =>
            onChange({ ...details, vibeImpression: e.target.value || null })
          }
          onBlur={() => onPersist({ vibeImpression: details.vibeImpression?.trim() || null })}
        />
      </label>

      <label className="space-y-1" id="appearance.clothingMotifs">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
          Clothing motifs
        </span>
        <input
          className={appearanceFieldClass}
          placeholder="Moon-and-star regalia, ribboned sailor silhouettes, crescent gold accents……"
          value={details.clothingMotifs ?? ''}
          onChange={(e) =>
            onChange({ ...details, clothingMotifs: e.target.value || null })
          }
          onBlur={() => onPersist({ clothingMotifs: details.clothingMotifs?.trim() || null })}
        />
      </label>

      <label className="space-y-1" id="appearance.distinguishingFeatures">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
          Distinguishing features
        </span>
        <input
          className={appearanceFieldClass}
          placeholder="Silver burn scar, cedar smoke scent — comma-separated"
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
      </label>

      <label className="space-y-1" id="appearance.visibleInjuries">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
          Visible injuries
        </span>
        <input
          className={appearanceFieldClass}
          placeholder="Limping left leg, bandaged hand — comma-separated"
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
      </label>
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
