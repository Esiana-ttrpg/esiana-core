/** Application-layer literals (Prisma stores these as String). */

export const UserRoles = {
  USER: 'USER',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
} as const;
export type UserRoleLiteral = (typeof UserRoles)[keyof typeof UserRoles];

export const StorageProviders = {
  LOCAL: 'LOCAL',
  S3: 'S3',
} as const;
export type StorageProviderLiteral =
  (typeof StorageProviders)[keyof typeof StorageProviders];

/** Narrative/collaboration membership roles (CampaignMember.role). */
export const CampaignMemberRoles = {
  GAMEMASTER: 'GAMEMASTER',
  WRITER: 'WRITER',
  PARTICIPANT: 'PARTICIPANT',
  OBSERVER: 'OBSERVER',
} as const;
export type CampaignMemberRole =
  (typeof CampaignMemberRoles)[keyof typeof CampaignMemberRoles];

/** @deprecated Use CampaignMemberRoles — legacy literals for backups/migration only. */
export const LegacyCampaignMemberRoles = {
  DM: 'DM',
  CO_DM: 'Co-DM',
  MEMBER: 'Member',
  PLAYER: 'Player',
  VIEWER: 'Viewer',
} as const;

export const JoinRequestStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
} as const;
export type JoinRequestStatusType =
  (typeof JoinRequestStatus)[keyof typeof JoinRequestStatus];

export const WikiVisibility = {
  PUBLIC: 'Public',
  PARTY: 'Party',
  DM_ONLY: 'DM_Only',
} as const;
export type WikiVisibilityType =
  (typeof WikiVisibility)[keyof typeof WikiVisibility];

export const AssetTypes = {
  MAP: 'map',
  SCENE: 'scene',
  GENERIC: 'generic',
  CAMPAIGN_COVER: 'campaign-cover',
  TAG_ICON: 'tag-icon',
  SIDEBAR_ICON: 'sidebar-icon',
} as const;

export const ALLOWED_TAG_ICON_MIME = ['image/svg+xml'] as const;
export const ALLOWED_TAG_ICON_EXT = ['.svg'] as const;
export const MAX_TAG_ICON_BYTES = 32 * 1024;
export type AssetType = (typeof AssetTypes)[keyof typeof AssetTypes];

export const MapPinTypes = {
  LOCATION: 'Location',
  SETTLEMENT: 'Settlement',
  RUIN: 'Ruin',
  DUNGEON: 'Dungeon',
  GEOGRAPHY: 'Geography',
  QUEST: 'Quest',
} as const;
export type MapPinType = (typeof MapPinTypes)[keyof typeof MapPinTypes];

export const MAP_PIN_TYPE_VALUES = Object.values(MapPinTypes) as [
  MapPinType,
  ...MapPinType[],
];

export const ALLOWED_IMAGE_MIME = [
  'image/webp',
  'image/png',
  'image/jpeg',
] as const;

export const ALLOWED_IMAGE_EXT = ['.webp', '.png', '.jpg', '.jpeg'] as const;
