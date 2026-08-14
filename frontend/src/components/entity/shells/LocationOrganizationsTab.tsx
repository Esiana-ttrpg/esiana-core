import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { buildLocationHubProjection } from '@/lib/locationHubProjection';
import {
  formatOrganizationLocationRoleLabel,
  type OrganizationLocationRole,
} from '@/lib/organizationLocationRelation';
import { EntityPageSection } from './EntityPageSection';
import type { WikiTreeNode } from '@/types/wiki';

const ROLE_SECTIONS: OrganizationLocationRole[] = [
  'headquarters',
  'presence',
  'territory',
  'influence',
];

interface LocationOrganizationsTabProps {
  campaignHandle: string;
  locationPageId: string;
  pageMetadata: unknown;
  flatPages: readonly WikiTreeNode[];
}

export function LocationOrganizationsTab({
  campaignHandle,
  locationPageId,
  pageMetadata,
  flatPages,
}: LocationOrganizationsTabProps) {
  const hub = useMemo(
    () =>
      buildLocationHubProjection({
        campaignHandle,
        locationPageId,
        pageMetadata,
        flatPages,
      }),
    [campaignHandle, locationPageId, pageMetadata, flatPages],
  );

  const hasAny = ROLE_SECTIONS.some((role) => hub.organizations[role].length > 0);
  if (!hasAny) {
    return (
      <p className="text-sm text-muted">
        Organizations appear when their headquarters or presence lists reference this location.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {ROLE_SECTIONS.map((role) => {
        const orgs = hub.organizations[role];
        if (orgs.length === 0) return null;
        return (
          <EntityPageSection
            key={role}
            id={`orgs-${role}`}
            title={formatOrganizationLocationRoleLabel(role)}
          >
            <ul className="space-y-1">
              {orgs.map((org) => (
                <li key={org.organizationId}>
                  <Link
                    to={campaignWikiPath(campaignHandle, org.organizationId, flatPages)}
                    className="text-sm hover:text-primary"
                  >
                    {org.title}
                  </Link>
                </li>
              ))}
            </ul>
          </EntityPageSection>
        );
      })}
    </div>
  );
}
