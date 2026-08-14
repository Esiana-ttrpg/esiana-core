import type { IconType } from 'react-icons';
import { FaSlack } from 'react-icons/fa';
import {
  SiDiscord,
  SiDiscourse,
  SiFoundryvirtualtabletop,
  SiGitter,
  SiMatrix,
  SiRoll20,
  SiTelegram,
} from 'react-icons/si';
import { Map, MessagesSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { IntegrationProviderId } from '@shared/campaignIntegrations';

export type IntegrationIconComponent = IconType | LucideIcon;

const ICON_BY_PROVIDER: Record<IntegrationProviderId, IntegrationIconComponent> = {
  discord: SiDiscord,
  slack: FaSlack,
  matrix: SiMatrix,
  telegram: SiTelegram,
  stoat: MessagesSquare,
  gitter: SiGitter,
  discourse: SiDiscourse,
  foundry: SiFoundryvirtualtabletop,
  roll20: SiRoll20,
  owlbear: Map,
};

export function integrationProviderIcon(
  provider: IntegrationProviderId,
): IntegrationIconComponent {
  return ICON_BY_PROVIDER[provider] ?? MessagesSquare;
}
