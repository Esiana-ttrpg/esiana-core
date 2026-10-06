import { AlignLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TYPE_PROSE_CLASS } from '@/lib/surfaceLayout';
import { DashboardWidgetShell } from '../DashboardWidgetShell';

interface DescriptionWidgetProps {
  description: string | null;
  customizeMode?: boolean;
  onHide?: () => void;
}

export function DescriptionWidget({ description, customizeMode, onHide }: DescriptionWidgetProps) {
  const { t } = useTranslation();

  return (
    <DashboardWidgetShell
      title={t('campaign.dashboard.widgetDescription')}
      icon={<AlignLeft className="size-4 text-primary" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      <p className={`${TYPE_PROSE_CLASS} whitespace-pre-wrap text-sm text-foreground/90`}>
        {description?.trim() || t('campaign.dashboard.descriptionWidgetEmpty')}
      </p>
    </DashboardWidgetShell>
  );
}
