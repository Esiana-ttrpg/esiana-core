import type { PluginConfigTemplateField, PluginCategory, PluginScope } from '@/lib/pluginManifest';
import type { ThemeProfile } from '@/lib/theme';

export interface SystemRegistrationSettings {
  allowRegistrations: boolean;
  allowedDomains: string;
}

export interface SystemSmtpSettings {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
  fromAddress: string;
}

export interface SystemUploadSettings {
  maxUploadSizeMb: number;
  mapMaxUploadSizeMb: number | null;
  mapDisplayMaxEdge: number;
  mapThumbMaxEdge: number;
  mapPreserveFullRes: boolean;
  allowedImageTypes: string;
  maxImageWidth: number;
  maxImageHeight: number;
}

export interface SystemUrlImportSettings {
  enabled: boolean;
  allowHttp: boolean;
  maxDownloadMb: number;
  timeoutSeconds: number;
}

export interface StorageDriverCapabilities {
  upload: boolean;
  read: boolean;
  delete: boolean;
  thumbnailStorage: boolean;
  redirectDelivery?: boolean;
  presignedUpload?: boolean;
}

export interface SystemRelationsSettings {
  maxVisibleNodes: number | null;
  maxVisibleEdges: number | null;
}

export type BannerDuration = 'clear' | '1h' | '3h' | 'custom';

export interface SystemStatusSettings {
  maintenanceMode: boolean;
  systemBannerText: string;
  systemBannerExpiresAt: string | null;
}

export interface SystemStatusSettingsPatch {
  maintenanceMode?: boolean;
  systemBannerText?: string;
  bannerDuration?: BannerDuration;
  /** ISO or datetime-local string when bannerDuration is `custom`. */
  bannerExpiresAt?: string;
}

export interface SystemPluginRegistrySettings {
  registryUrl: string;
}

export interface SystemSettings {
  id: string;
  registration: SystemRegistrationSettings;
  smtp: SystemSmtpSettings;
  uploads: SystemUploadSettings;
  urlImports: SystemUrlImportSettings;
  status: SystemStatusSettings;
  plugins: SystemPluginRegistrySettings;
  branding: SystemBrandingSettings;
  footer: FooterConfig;
  notifications?: {
    pollIntervalSeconds: number;
    defaultTimezone: string;
  };
  relations?: SystemRelationsSettings;
  updatedAt: string;
}

export interface SystemSettingsPatch {
  registration?: Partial<SystemRegistrationSettings>;
  smtp?: Partial<SystemSmtpSettings>;
  uploads?: Partial<SystemUploadSettings>;
  urlImports?: Partial<SystemUrlImportSettings>;
  status?: Partial<SystemStatusSettings> & SystemStatusSettingsPatch;
  plugins?: Partial<SystemPluginRegistrySettings>;
  branding?: Partial<SystemBrandingSettings>;
  footer?: Partial<FooterConfig>;
  notifications?: {
    pollIntervalSeconds?: number;
    defaultTimezone?: string;
  };
  relations?: Partial<SystemRelationsSettings>;
  pluginRegistryUrl?: string;
}

export type FooterAlignment = 'left' | 'center' | 'right';

export interface FooterConfig {
  customText: string;
  tosUrl: string;
  privacyPolicyUrl: string;
  discordUrl: string;
  githubUrl: string;
  alignment: FooterAlignment;
}

export interface SystemBrandingSettings {
  globalTitle: string;
  globalLogoUrl: string | null;
  faviconUrl: string | null;
  globalThemePreset: string;
  globalPalette: string;
  applyBackgroundTint: boolean;
  appearanceProfile?: ThemeProfile | null;
}

export interface PublicSystemStatus {
  systemBannerText: string;
  systemBannerExpiresAt: string | null;
  maintenanceMode: boolean;
  globalTitle: string;
  globalLogoUrl: string | null;
  faviconUrl: string | null;
  globalThemePreset: string;
  globalPalette: string;
  applyBackgroundTint: boolean;
  appearanceProfile?: ThemeProfile | null;
  footer: FooterConfig;
  defaultTimezone: string;
}

export interface SystemPluginRecord {
  id: string;
  name: string;
  scope: PluginScope;
  isEnabled: boolean;
  installedAt: string;
  version: string;
  description: string;
  category: PluginCategory | null;
  configTemplate: PluginConfigTemplateField[];
  configSchema?: Record<string, unknown>;
  uiSlots?: string[];
  permissions?: string[];
  engines?: Record<string, string>;
  config: Record<string, unknown>;
  updatedAt: string;
  runtimeStatus?: string;
  quarantineReason?: string | null;
  quarantinedAt?: string | null;
  recentErrors?: Array<{ at: string; entity: string; phase: string; message: string }>;
  manifestChecksum?: string;
  trustedInstall?: boolean;
  commitSha?: string;
}

export interface CampaignPluginCapabilityRecord {
  id: string;
  name: string;
  scope: PluginScope;
  version: string;
  description: string;
  category: PluginCategory | null;
  configTemplate: PluginConfigTemplateField[];
  configSchema?: Record<string, unknown>;
  uiSlots?: string[];
  frontendEntry?: string | null;
  runtimeStatus?: string;
  quarantineReason?: string | null;
  quarantinedAt?: string | null;
  commitSha?: string;
  trustedInstall?: boolean;
}

export interface CampaignPluginDescriptor {
  id: string;
  name: string;
  scope: PluginScope;
  version: string;
  description: string;
  category: PluginCategory | null;
  configTemplate: PluginConfigTemplateField[];
  configSchema?: Record<string, unknown>;
  uiSlots?: string[];
  frontendEntry?: string | null;
}
export interface CampaignPluginSettingRecord {
  campaignId: string;
  pluginId: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
  plugin: {
    id: string;
    name: string;
    scope: PluginScope;
    version: string;
    description: string;
    category: PluginCategory | null;
    configTemplate: PluginConfigTemplateField[];
    configSchema?: Record<string, unknown>;
    uiSlots?: string[];
    frontendEntry?: string | null;
  };
  updatedAt: string;
}

export interface SystemPluginConfigPayload {
  config: Record<string, unknown>;
  isEnabled?: boolean;
}

export type BackgroundTaskType = 'AD_HOC' | 'SCHEDULED';
export type BackgroundTaskStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface BackgroundTaskRecord {
  id: string;
  taskName: string;
  targetCampaign: string | null;
  type: BackgroundTaskType;
  status: BackgroundTaskStatus;
  progress: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  abortable: boolean;
}

export interface ScheduledSystemJobDefinition {
  id: string;
  taskName: string;
  schedule: string;
  description: string;
  scope: string;
}

export interface BackgroundTaskSnapshot {
  metrics: {
    totalRunningWorkers: number;
    system: {
      cpuUsagePercent: number;
      memoryUsedMb: number;
      memoryTotalMb: number;
    };
    janitor: {
      freedBytesThisWeek: number;
      freedFormattedThisWeek: string;
    };
  };
  tasks: BackgroundTaskRecord[];
  history: BackgroundTaskRecord[];
  scheduledJobs: ScheduledSystemJobDefinition[];
}
