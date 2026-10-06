import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { META_FIELD_LABEL_CLASS, TYPE_PROSE_CLASS } from '@/lib/surfaceLayout';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

const MAX_TITLE_LENGTH = 80;
const MAX_TEXT_LENGTH = 2_000;

interface TextWidgetProps {
  config?: Record<string, unknown>;
  customizeMode?: boolean;
  onHide?: () => void;
  onConfigChange: (config: Record<string, unknown>) => void;
}

function configString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function TextWidget({ config, customizeMode, onHide, onConfigChange }: TextWidgetProps) {
  const { t } = useTranslation();
  const title = configString(config?.title, t('campaign.dashboard.widgetText')).slice(0, MAX_TITLE_LENGTH);
  const body = configString(config?.text).slice(0, MAX_TEXT_LENGTH);

  return (
    <DashboardWidgetShell
      title={title || t('campaign.dashboard.widgetText')}
      icon={<FileText className="size-4 text-primary" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {customizeMode ? (
        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className={META_FIELD_LABEL_CLASS}>{t('campaign.dashboard.textWidgetTitle')}</span>
            <input
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(event) => onConfigChange({ ...config, title: event.target.value, text: body })}
              className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground"
            />
          </label>
          <label className="block space-y-1.5">
            <span className={META_FIELD_LABEL_CLASS}>{t('campaign.dashboard.textWidgetBody')}</span>
            <textarea
              value={body}
              maxLength={MAX_TEXT_LENGTH}
              rows={4}
              onChange={(event) => onConfigChange({ ...config, title, text: event.target.value })}
              className="w-full resize-y rounded-md border border-border bg-background px-2.5 py-2 text-sm text-foreground"
            />
          </label>
        </div>
      ) : (
        <p className={`${TYPE_PROSE_CLASS} whitespace-pre-wrap text-sm text-foreground/90`}>
          {body || t('campaign.dashboard.textWidgetEmpty')}
        </p>
      )}
    </DashboardWidgetShell>
  );
}
