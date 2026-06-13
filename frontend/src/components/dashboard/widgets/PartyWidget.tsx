import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EnsembleMemberSummary } from '@/lib/dashboardSummary';
import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface PartyWidgetProps {
  campaignHandle: string;
  members: EnsembleMemberSummary[];
  customizeMode?: boolean;
  onHide?: () => void;
}

export function PartyWidget({
  campaignHandle,
  members,
  customizeMode,
  onHide,
}: PartyWidgetProps) {
  const { flatPages } = useWiki();

  return (
    <DashboardWidgetShell
      title="The Party"
      icon={<Users className="size-4 text-emerald-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {members.length === 0 ? (
        <p className="text-sm text-muted">
          Your fellowship will appear here as players join the campaign.
        </p>
      ) : (
        <ul className="space-y-3">
          {members.map((member) => {
            const href = member.identityPageId
              ? campaignCategoryChildPath(
                  campaignHandle,
                  member.identityPageId,
                  'Characters',
                  flatPages,
                )
              : campaignCategoryChildPath(
                  campaignHandle,
                  member.userId,
                  'Characters',
                  flatPages,
                );
            return (
              <li key={member.userId}>
                <Link
                  to={href}
                  className="block rounded-lg border border-border bg-background/50 px-3 py-2 transition-colors hover:border-emerald-500/40"
                >
                  <p className="font-medium text-foreground">{member.playerLabel}</p>
                  {member.identityPageId ? (
                    <p className="text-xs text-muted">View character</p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardWidgetShell>
  );
}
