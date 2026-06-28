import {
  INTEGRATION_SLOTS,
  providerLabel,
  type CampaignIntegrations,
} from '@shared/campaignIntegrations';
import { integrationProviderIcon } from '@/lib/integrationProviderIcons';

const headerControlClass =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-[rgb(var(--color-focal-rgb)/0.06)]';

interface CampaignHeaderIntegrationsProps {
  integrations: CampaignIntegrations | null | undefined;
}

export function CampaignHeaderIntegrations({
  integrations,
}: CampaignHeaderIntegrationsProps) {
  if (!integrations) return null;

  const links = INTEGRATION_SLOTS.flatMap((slot) => {
    const link = integrations[slot];
    if (!link?.url?.trim()) return [];
    return [{ slot, link }];
  });

  if (links.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      {links.map(({ slot, link }) => {
        const Icon = integrationProviderIcon(link.provider);
        const label = providerLabel(link.provider);
        return (
          <a
            key={slot}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={headerControlClass}
            aria-label={`${label} (opens in new tab)`}
            title={label}
          >
            <Icon className="size-4" aria-hidden />
          </a>
        );
      })}
    </div>
  );
}
