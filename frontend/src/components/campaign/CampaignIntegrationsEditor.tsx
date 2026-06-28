import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  INTEGRATION_SLOTS,
  INTEGRATION_SLOT_META,
  type CampaignIntegrations,
  type ChatProvider,
  type IntegrationProviderId,
  type IntegrationSlotId,
  type TabletopProvider,
  hasConfiguredIntegrations,
  isChatProvider,
  isTabletopProvider,
  providersForSlot,
  validateIntegrationUrl,
} from '@shared/campaignIntegrations';
import { integrationProviderIcon } from '@/lib/integrationProviderIcons';
import { controlClasses } from '@/components/ui/formStyles';

type SlotDraft = {
  provider: IntegrationProviderId | '';
  url: string;
};

function linkToDraft(
  link: { provider: IntegrationProviderId; url: string } | null | undefined,
): SlotDraft {
  if (!link) return { provider: '', url: '' };
  return { provider: link.provider, url: link.url };
}

function draftsFromValue(value: CampaignIntegrations | null): Record<IntegrationSlotId, SlotDraft> {
  return {
    chat: linkToDraft(value?.chat ?? null),
    tabletop: linkToDraft(value?.tabletop ?? null),
  };
}

function buildIntegrationsFromDrafts(
  drafts: Record<IntegrationSlotId, SlotDraft>,
): CampaignIntegrations | null {
  const result: CampaignIntegrations = {};
  const chat = drafts.chat;
  if (chat.provider && chat.url.trim() && isChatProvider(chat.provider)) {
    result.chat = { provider: chat.provider as ChatProvider, url: chat.url.trim() };
  }
  const tabletop = drafts.tabletop;
  if (tabletop.provider && tabletop.url.trim() && isTabletopProvider(tabletop.provider)) {
    result.tabletop = {
      provider: tabletop.provider as TabletopProvider,
      url: tabletop.url.trim(),
    };
  }
  return hasConfiguredIntegrations(result) ? result : null;
}

interface CampaignIntegrationsEditorProps {
  value: CampaignIntegrations | null;
  onChange: (value: CampaignIntegrations | null) => void;
}

export function CampaignIntegrationsEditor({
  value,
  onChange,
}: CampaignIntegrationsEditorProps) {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<Record<IntegrationSlotId, SlotDraft>>(() =>
    draftsFromValue(value),
  );
  const [slotErrors, setSlotErrors] = useState<Partial<Record<IntegrationSlotId, string>>>({});

  const slotWarnings = useMemo(() => {
    const warnings: Partial<Record<IntegrationSlotId, string>> = {};
    for (const slot of INTEGRATION_SLOTS) {
      const url = drafts[slot].url.trim();
      if (!url) continue;
      const check = validateIntegrationUrl(url);
      if (check.warnHttp) {
        warnings[slot] = t('campaign.settings.integrations.httpWarning');
      }
    }
    return warnings;
  }, [drafts]);

  function updateDraft(slot: IntegrationSlotId, patch: Partial<SlotDraft>) {
    setDrafts((current) => {
      const next = { ...current, [slot]: { ...current[slot], ...patch } };
      onChange(buildIntegrationsFromDrafts(next));
      return next;
    });
    setSlotErrors((current) => ({ ...current, [slot]: undefined }));
  }

  function clearSlot(slot: IntegrationSlotId) {
    setDrafts((current) => {
      const next = { ...current, [slot]: { provider: '', url: '' } };
      onChange(buildIntegrationsFromDrafts(next));
      return next;
    });
    setSlotErrors((current) => ({ ...current, [slot]: undefined }));
  }

  function validateDrafts(): boolean {
    const errors: Partial<Record<IntegrationSlotId, string>> = {};
    for (const slot of INTEGRATION_SLOTS) {
      const draft = drafts[slot];
      const hasProvider = Boolean(draft.provider);
      const hasUrl = Boolean(draft.url.trim());
      if (hasProvider !== hasUrl) {
        errors[slot] = t('campaign.settings.integrations.pairRequired');
        continue;
      }
      if (hasUrl) {
        const check = validateIntegrationUrl(draft.url);
        if (!check.ok) {
          errors[slot] = check.error ?? 'Invalid URL.';
        }
      }
    }
    setSlotErrors(errors);
    return Object.keys(errors).length === 0;
  }

  return (
    <div className="space-y-4">
      {INTEGRATION_SLOTS.map((slot) => {
        const meta = INTEGRATION_SLOT_META[slot];
        const draft = drafts[slot];
        const providers = providersForSlot(slot);
        const Icon = draft.provider ? integrationProviderIcon(draft.provider) : null;

        return (
          <div
            key={slot}
            className="space-y-2 rounded-lg border border-border/80 bg-background/40 p-3"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{meta.label}</p>
              <p className="text-xs text-muted">{meta.settingsDescription}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {Icon ? (
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted">
                    <Icon className="size-4" aria-hidden />
                  </span>
                ) : null}
                <select
                  value={draft.provider}
                  onChange={(event) =>
                    updateDraft(slot, {
                      provider: event.target.value as IntegrationProviderId | '',
                    })
                  }
                  className={`${controlClasses} min-w-[10rem] flex-1`}
                  aria-label={`${meta.label} provider`}
                >
                  <option value="">None</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="url"
                value={draft.url}
                onChange={(event) => updateDraft(slot, { url: event.target.value })}
                onBlur={validateDrafts}
                placeholder="https://"
                className={`${controlClasses} min-w-0 flex-[2]`}
                aria-label={`${meta.label} URL`}
              />
              <button
                type="button"
                onClick={() => clearSlot(slot)}
                className="shrink-0 rounded-md border border-border px-3 py-2 text-xs text-muted transition-colors hover:bg-elevated hover:text-foreground"
              >
                {t('campaign.settings.integrations.clear')}
              </button>
            </div>
            {slotErrors[slot] ? (
              <p className="text-xs text-red-300">{slotErrors[slot]}</p>
            ) : null}
            {!slotErrors[slot] && slotWarnings[slot] ? (
              <p className="text-xs text-amber-200/90">{slotWarnings[slot]}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function validateCampaignIntegrationsDraft(
  value: CampaignIntegrations | null,
): string | null {
  if (!value) return null;
  for (const slot of INTEGRATION_SLOTS) {
    const link = value[slot];
    if (!link) continue;
    const check = validateIntegrationUrl(link.url);
    if (!check.ok) {
      return check.error ?? 'Invalid integration URL.';
    }
  }
  return null;
}
