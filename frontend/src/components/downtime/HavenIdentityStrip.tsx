import { Link } from 'react-router-dom';
import type { DowntimeHavenOverviewIdentity } from '@shared/downtimeHub';

interface HavenIdentityStripProps {
  title: string;
  identity: DowntimeHavenOverviewIdentity;
}

export function HavenIdentityStrip({ title, identity }: HavenIdentityStripProps) {
  const hasVisual =
    identity.bannerUrl ||
    identity.portraitUrl ||
    identity.crestUrl ||
    identity.galleryUrls.length > 0;
  const hasMeta =
    identity.summary ||
    identity.locationLabel ||
    identity.factions.length > 0;

  if (!hasVisual && !hasMeta) {
    return (
      <header>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      </header>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-elevated/20">
      {identity.bannerUrl ? (
        <div className="relative h-36 w-full overflow-hidden sm:h-44">
          <img
            src={identity.bannerUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        </div>
      ) : null}

      <div className={`flex gap-4 p-5 ${identity.bannerUrl ? '-mt-10 relative' : ''}`}>
        {identity.portraitUrl ? (
          <img
            src={identity.portraitUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-lg border border-border object-cover shadow-md sm:h-24 sm:w-24"
          />
        ) : identity.crestUrl ? (
          <img
            src={identity.crestUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {identity.summary ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {identity.summary}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {identity.locationLabel && identity.locationHref ? (
              <Link
                to={identity.locationHref}
                className="rounded-full border border-border bg-background/60 px-3 py-0.5 text-foreground hover:border-primary/40"
              >
                {identity.locationLabel}
              </Link>
            ) : null}
            {identity.factions.map((faction) => (
              <Link
                key={faction.pageId}
                to={faction.href}
                className="rounded-full border border-border bg-background/60 px-3 py-0.5 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              >
                {faction.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {identity.galleryUrls.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto border-t border-border/60 px-5 py-3">
          {identity.galleryUrls.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              className="h-16 w-24 shrink-0 rounded object-cover opacity-90"
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
