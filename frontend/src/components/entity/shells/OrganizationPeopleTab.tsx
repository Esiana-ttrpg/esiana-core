import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import {
  buildOrganizationPeopleProjection,
  groupFiguresByArchetype,
} from '@/lib/organizationPeopleProjection';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';
import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import type { WikiTreeNode } from '@/types/wiki';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface OrganizationPeopleTabProps {
  campaignHandle: string;
  pageId: string;
  flatPages: WikiTreeNode[];
  isDMUser?: boolean;
}

export function OrganizationPeopleTab({
  campaignHandle,
  pageId,
  flatPages,
  isDMUser: isDMUserProp,
}: OrganizationPeopleTabProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const campaignNow = useCampaignChronologyNow(campaignHandle);
  const org = parseOrganizationMetadata(
    flatPages.find((p) => p.id === pageId)?.metadata,
  );
  const snapshots = flatPages.map((p) => ({
    id: p.id,
    title: p.title,
    templateType: p.templateType,
    metadata: p.metadata ?? null,
  }));

  const figures = buildOrganizationPeopleProjection(
    pageId,
    snapshots,
    campaignNow,
    isDMUser,
  );
  const groups = groupFiguresByArchetype(figures.slice(0, 24));

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Who embodies this organization — narrative gravity, not a member directory.
      </p>

      {figures.length === 0 ? (
        <p className="text-sm text-muted">
          No embodying figures linked. Assign leaders and affiliations on character pages.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.archetype} className="space-y-2">
            <h3 className={META_SECTION_LABEL_CLASS}>
              {group.label}
            </h3>
            <ul className="space-y-2">
              {group.figures.map((fig) => (
                <li
                  key={fig.id}
                  className="rounded-lg border border-border/60 bg-surface/30 px-3 py-2"
                >
                  <Link
                    to={campaignWikiPath(campaignHandle, fig.id, flatPages)}
                    className="font-medium text-primary hover:underline"
                  >
                    {fig.title}
                  </Link>
                  {fig.subtitle ? (
                    <p className="text-xs text-muted">{fig.subtitle}</p>
                  ) : null}
                  {org.leaderId === fig.id && (
                    <span className="mt-1 inline-block text-[10px] text-amber-600">
                      Current leader
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {figures.length > 24 ? (
        <p className="text-xs text-muted">
          Showing top 24 figures by narrative significance.
        </p>
      ) : null}
    </div>
  );
}
