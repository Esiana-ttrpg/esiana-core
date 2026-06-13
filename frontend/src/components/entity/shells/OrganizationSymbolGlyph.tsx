import {
  SYMBOL_PRESET_ICONS,
  SYMBOL_PRESET_LABELS,
  resolveDoctrineTint,
} from '@/lib/organizationSymbolPresets';
import type { OrganizationSymbolPreset } from '@/lib/organizationMetadata';

interface OrganizationSymbolGlyphProps {
  preset: OrganizationSymbolPreset | null;
  doctrineTint?: string | null;
  emblemUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'size-8 text-sm',
  md: 'size-10 text-base',
  lg: 'size-14 text-lg',
};

export function OrganizationSymbolGlyph({
  preset,
  doctrineTint,
  emblemUrl,
  size = 'md',
  className = '',
}: OrganizationSymbolGlyphProps) {
  const tint = resolveDoctrineTint(preset, doctrineTint ?? null);
  const Icon = preset ? SYMBOL_PRESET_ICONS[preset] : null;

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-surface/60 ${SIZE_CLASSES[size]} ${className}`}
      style={
        tint && !emblemUrl
          ? {
              borderColor: `${tint}55`,
              backgroundColor: `${tint}18`,
              color: tint,
            }
          : undefined
      }
      title={emblemUrl ? 'Organization crest' : preset ? SYMBOL_PRESET_LABELS[preset] : 'No symbol'}
      aria-hidden={!preset && !emblemUrl}
    >
      {emblemUrl ? (
        <img src={emblemUrl} alt="" className="size-full object-cover" />
      ) : Icon ? (
        <Icon className="size-[55%]" strokeWidth={1.75} />
      ) : (
        <span className="text-[10px] text-muted">—</span>
      )}
    </div>
  );
}
