/**
 * Generic page export registry and helpers.
 *
 * Future server-generated exports (campaign ZIPs, plugin packages, PDFs, etc.)
 * must register temporary files with Asset Janitor Sweep (backend assetRetention)
 * so artifacts expire after ~3 days. MVP page export is client-side only.
 */

import type { LucideIcon } from 'lucide-react';
import type { CampaignDiscoverabilityValue } from '@shared/campaignPolicy/discoverability';
import type { WikiPageBlock } from '@/types/wiki';

export interface PageExportPageContext {
  id: string;
  title: string;
  pathKey: string;
  templateType: string;
  visibility: string;
  tagNames: string[];
  metadata?: unknown;
  parentId?: string | null;
}

export interface PageExportCampaignContext {
  handle: string;
  id?: string;
  name?: string;
  discoverability?: CampaignDiscoverabilityValue;
  /** Absolute campaign URL when discoverability allows sharing. */
  shareUrl?: string;
}

export interface PageExportExtras {
  breadcrumbTitles?: string[];
}

export interface PageExportContext {
  page: PageExportPageContext;
  campaign: PageExportCampaignContext;
  blocks: WikiPageBlock[];
  printableElement: HTMLElement | null;
  extras?: Record<string, unknown>;
}

export interface PageExportHandler {
  id: string;
  label: string;
  extension?: string;
  mimeType?: string;
  icon?: LucideIcon;
  order: number;
  run: (context: PageExportContext) => void | Promise<void>;
}
