import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DashboardSummary } from '@/lib/dashboardSummary';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface CampaignBulletinWidgetProps {
  bulletin: DashboardSummary['bulletin'];
  customizeMode?: boolean;
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
  onHide?: () => void;
}

export function CampaignBulletinWidget({
  bulletin,
  customizeMode,
  config,
  onConfigChange,
  onHide,
}: CampaignBulletinWidgetProps) {
  const bodyFromConfig =
    typeof config?.body === 'string' && config.body.trim()
      ? config.body.trim()
      : null;
  const announcements =
    bodyFromConfig ?? bulletin.announcementsMarkdown ?? null;

  return (
    <DashboardWidgetShell
      title="Campaign Bulletin"
      icon={<Megaphone className="size-4 text-amber-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      <div className="space-y-4">
        {customizeMode ? (
          <textarea
            value={typeof config?.body === 'string' ? config.body : announcements ?? ''}
            onChange={(event) => onConfigChange?.({ ...config, body: event.target.value })}
            rows={4}
            placeholder="Welcome to the campaign — house rules, tone, and reminders live here."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        ) : announcements ? (
          <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{announcements}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Welcome to the campaign. Your DM can pin announcements here.
          </p>
        )}

        {bulletin.activity.length > 0 ? (
          <div className="border-t border-border pt-3">
            <p className={`mb-2 ${META_SECTION_LABEL_CLASS}`}>
              Recent activity
            </p>
            <ul className="space-y-2">
              {bulletin.activity.map((item) => (
                <li key={item.id} className="text-sm text-foreground">
                  {item.href ? (
                    <Link to={item.href} className="hover:text-primary hover:underline">
                      {item.line}
                    </Link>
                  ) : (
                    item.line
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </DashboardWidgetShell>
  );
}
