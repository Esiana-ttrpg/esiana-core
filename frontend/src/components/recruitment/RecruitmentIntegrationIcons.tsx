import { providerLabel, type IntegrationProviderId } from '@shared/campaignIntegrations';
import { integrationProviderIcon } from '@/lib/integrationProviderIcons';

interface RecruitmentIntegrationIconsProps {
  providers: IntegrationProviderId[];
  className?: string;
}

export function RecruitmentIntegrationIcons({
  providers,
  className,
}: RecruitmentIntegrationIconsProps) {
  if (providers.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ''}`.trim()}>
      {providers.map((provider) => {
        const Icon = integrationProviderIcon(provider);
        const label = providerLabel(provider);
        return (
          <span
            key={provider}
            title={label}
            aria-label={label}
            className="inline-flex size-7 items-center justify-center rounded-md border border-border bg-background text-muted"
          >
            <Icon className="size-4 text-muted" aria-hidden />
          </span>
        );
      })}
    </div>
  );
}
