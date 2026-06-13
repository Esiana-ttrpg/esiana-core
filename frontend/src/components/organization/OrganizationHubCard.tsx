import { Link } from 'react-router-dom';
import { OrganizationSymbolGlyph } from '@/components/entity/shells/OrganizationSymbolGlyph';
import { buildOrganizationIdentityProjection } from '@/lib/organizationIdentityProjection';
import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import type { CategoryIndexChild } from '@/lib/wiki';
import type { ReputationStandingCard } from '@shared/downtimeHub';

interface OrganizationHubCardProps {
  child: CategoryIndexChild;
  campaignHandle: string;
  standing?: ReputationStandingCard | null;
  isNested?: boolean;
}

export function OrganizationHubCard({
  child,
  campaignHandle,
  standing,
  isNested = false,
}: OrganizationHubCardProps) {
  const { flatPages } = useWiki();
  const org = parseOrganizationMetadata(child.metadata);
  const projection = buildOrganizationIdentityProjection(child.id, [
    {
      id: child.id,
      title: child.title,
      templateType: 'ORGANIZATION',
      metadata: child.metadata,
    },
  ]);
  const isSecret =
    org.organizationalVisibility === 'secret' ||
    org.organizationalVisibility === 'quiet';
  const tint = projection?.doctrineTint;

  return (
    <Link
      to={campaignWikiPath(campaignHandle, child.id, flatPages)}
      className={`flex gap-3 rounded-lg border border-border/60 bg-surface/40 p-3 transition-colors hover:border-primary/40 ${
        isNested ? 'ml-4 border-l-2' : ''
      } ${isSecret ? 'opacity-85' : ''}`}
      style={tint && !isNested ? { borderLeftWidth: 3, borderLeftColor: tint } : undefined}
    >
      <OrganizationSymbolGlyph
        preset={projection?.symbolPreset ?? null}
        doctrineTint={projection?.doctrineTint}
        emblemUrl={projection?.emblemUrl}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{child.title}</p>
        <p className="truncate text-xs text-muted">
          {[
            projection?.worldStateLabel,
            org.currentPressures[0],
          ]
            .filter(Boolean)
            .join(' · ') || org.orgType || 'Organization'}
        </p>
        {standing ? (
          <p className="mt-1 text-[10px] text-muted">
            Trust {standing.trustBand} · Notoriety {standing.notorietyBand}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
