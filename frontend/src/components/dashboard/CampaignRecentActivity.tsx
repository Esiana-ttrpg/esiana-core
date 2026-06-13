import { Link } from 'react-router-dom';
import type { CampaignNarrativeSnapshot } from '@/lib/dashboardNarrativeSnapshot';
import { formatRelativeUpdated } from '@/utils/formatDate';
import {
  SURFACE_SILENT_CLASS,
  TYPE_META_CLASS,
  TYPE_PROSE_CLASS,
} from '@/lib/surfaceLayout';

interface CampaignRecentActivityProps {
  activity: CampaignNarrativeSnapshot['recentActivity'];
}

export function CampaignRecentActivity({ activity }: CampaignRecentActivityProps) {
  return (
    <div className={`${SURFACE_SILENT_CLASS} region-depth-1 rounded-xl px-4 py-5 sm:px-6`}>
      <h2 className={`${TYPE_META_CLASS} font-semibold uppercase tracking-wider text-focal-muted`}>
        Recent Activity
      </h2>
      {activity.items.length === 0 ? (
        <p className={`${TYPE_PROSE_CLASS} mt-3 text-sm text-prose-muted`}>{activity.emptyMessage}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {activity.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-primary/70" aria-hidden />
              <div className="min-w-0 flex-1">
                {item.href ? (
                  <Link
                    to={item.href}
                    className="font-medium text-focal-foreground hover:text-primary"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <span className="font-medium text-focal-foreground">{item.title}</span>
                )}
                {item.reason ? (
                  <span className="text-focal-muted"> — {item.reason}</span>
                ) : null}
                <p className={`${TYPE_META_CLASS} mt-0.5 normal-case tracking-normal text-recessed-foreground`}>
                  {formatRelativeUpdated(item.updatedAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link
        to={activity.viewAllHref}
        className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
      >
        View full continuity →
      </Link>
    </div>
  );
}
