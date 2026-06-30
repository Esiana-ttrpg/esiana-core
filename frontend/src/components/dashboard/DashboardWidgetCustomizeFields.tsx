import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface DashboardWidgetCustomizeFieldsProps {
  category?: ReactNode;
  sort: ReactNode;
  limit: ReactNode;
}

export function DashboardWidgetCustomizeFields({
  category,
  sort,
  limit,
}: DashboardWidgetCustomizeFieldsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {category ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted">
            {t('campaign.dashboard.widgetCustomizeCategory')}
          </p>
          {category}
        </div>
      ) : null}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted">
          {t('campaign.dashboard.widgetCustomizeSort')}
        </p>
        {sort}
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted">
          {t('campaign.dashboard.widgetCustomizeLimit')}
        </p>
        {limit}
      </div>
    </div>
  );
}

function optionClass(selected: boolean): string {
  return `rounded-md border px-2 py-1.5 text-xs ${
    selected
      ? 'border-primary/60 bg-primary/10 text-primary'
      : 'border-border text-foreground hover:border-primary/40'
  }`;
}

export function CustomizeOptionButton({
  selected,
  onClick,
  children,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${optionClass(selected)} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

export function CustomizeOptionGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}
