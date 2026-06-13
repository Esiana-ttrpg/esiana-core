import { deriveUsername } from './userDisplay.js';
import { sanitizeGmStyleTags } from './gmStyleTags.js';

export const userPublicFieldsSelect = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  pronouns: true,
  publicBio: true,
  statusBlurb: true,
  bluesky: true,
  discord: true,
  github: true,
  reddit: true,
  mastodon: true,
  otherLink: true,
  gmStyleTags: true,
} as const;

export type UserPublicFieldsRow = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  pronouns: string | null;
  publicBio: string | null;
  statusBlurb: string | null;
  bluesky: string | null;
  discord: string | null;
  github: string | null;
  reddit: string | null;
  mastodon: string | null;
  otherLink: string | null;
  gmStyleTags?: unknown;
};

export function serializeUserPublicFields(user: UserPublicFieldsRow) {
  return {
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    pronouns: user.pronouns,
    username: deriveUsername(user.email),
    publicBio: user.publicBio,
    statusBlurb: user.statusBlurb,
    bluesky: user.bluesky,
    discord: user.discord,
    github: user.github,
    reddit: user.reddit,
    mastodon: user.mastodon,
    otherLink: user.otherLink,
    gmStyleTags: sanitizeGmStyleTags(user.gmStyleTags),
  };
}
