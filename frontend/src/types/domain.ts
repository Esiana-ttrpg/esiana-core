/** Mirrors backend application-layer string literals. */

export const UserRoles = {
  USER: 'USER',
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
} as const;
export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

export const StorageProviders = {
  LOCAL: 'LOCAL',
  S3: 'S3',
} as const;
export type StorageProvider =
  (typeof StorageProviders)[keyof typeof StorageProviders];

/** Narrative/collaboration membership roles. */
export const CampaignMemberRoles = {
  GAMEMASTER: 'GAMEMASTER',
  WRITER: 'WRITER',
  PARTICIPANT: 'PARTICIPANT',
  OBSERVER: 'OBSERVER',
} as const;
export type CampaignMemberRole =
  (typeof CampaignMemberRoles)[keyof typeof CampaignMemberRoles];

export {
  MEMBERSHIP_ROLE_UI_LABELS,
  membershipRoleUiLabel,
  isElevatedMembershipRole,
} from '../../../shared/campaignPolicy/membershipRoles';

export const WikiVisibility = {
  PUBLIC: 'Public',
  PARTY: 'Party',
  DM_ONLY: 'DM_Only',
} as const;
export type WikiVisibilityType =
  (typeof WikiVisibility)[keyof typeof WikiVisibility];

export const MapPinTypes = {
  LOCATION: 'Location',
  SETTLEMENT: 'Settlement',
  RUIN: 'Ruin',
  DUNGEON: 'Dungeon',
  GEOGRAPHY: 'Geography',
  QUEST: 'Quest',
} as const;
export type MapPinType = (typeof MapPinTypes)[keyof typeof MapPinTypes];
