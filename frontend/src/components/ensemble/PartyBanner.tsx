import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import type { EnsembleConfig } from '@/lib/ensembleConfig';

interface PartyBannerProps {
  campaignName: string;
  config: EnsembleConfig;
}

export function PartyBanner({ campaignName, config }: PartyBannerProps) {
  const displayName = config.name?.trim() || campaignName;
  const summary = config.summary?.trim() || config.activeArc?.trim() || '';
  const coverStyle = config.bannerImageUrl
    ? {
        backgroundImage: `linear-gradient(to bottom, rgba(2,6,23,0.25), rgba(2,6,23,0.88)), url(${config.bannerImageUrl})`,
        backgroundSize: 'cover' as const,
        backgroundPosition: 'center' as const,
      }
    : undefined;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border bg-surface/60 shadow-lg"
      style={coverStyle}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background/30 to-background/85" />
      <div className="relative px-6 py-8 sm:px-10 sm:py-10">
        {config.themes.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {config.themes.map((theme) => (
              <span
                key={theme}
                className="rounded-full border border-border/70 bg-background/40 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted"
              >
                {theme}
              </span>
            ))}
          </div>
        ) : null}
        <h1 className={TYPE_DISPLAY_CLASS}>
          {displayName}
        </h1>
        {summary ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-foreground/90 sm:text-lg">
            {summary}
          </p>
        ) : null}
        {config.knownFor.length > 0 ? (
          <ul className="mt-4 space-y-1 text-sm text-muted">
            {config.knownFor.map((item) => (
              <li key={item}>Known for {item}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
