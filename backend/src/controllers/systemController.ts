import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { PRODUCT_VERSION } from '../lib/productVersion.js';
import { isRemoteVersionNewer } from '../lib/semverCompare.js';

export const CURRENT_VERSION = PRODUCT_VERSION;

const GITHUB_LATEST_RELEASE_URL =
  'https://api.github.com/repos/Esiana-ttrpg/esiana-core/releases/latest';

const GITHUB_USER_AGENT = `Esiana-Update-Checker/${CURRENT_VERSION}`;

interface GitHubReleasePayload {
  tag_name?: string;
  body?: string | null;
  html_url?: string;
}

export interface VersionCheckResult {
  currentVersion: string;
  latestVersion: string | null;
  isUpdateAvailable: boolean;
  changelog: string | null;
  htmlUrl?: string;
}

function noUpdatePayload(): VersionCheckResult {
  return {
    currentVersion: CURRENT_VERSION,
    latestVersion: null,
    isUpdateAvailable: false,
    changelog: null,
  };
}

export async function checkSystemVersion(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  try {
    const response = await fetch(GITHUB_LATEST_RELEASE_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': GITHUB_USER_AGENT,
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (response.status === 404) {
      res.json(noUpdatePayload());
      return;
    }

    if (!response.ok) {
      console.warn(
        `[system] GitHub releases API returned ${response.status} for ${GITHUB_LATEST_RELEASE_URL}`,
      );
      res.json(noUpdatePayload());
      return;
    }

    const raw: unknown = await response.json();

    if (Array.isArray(raw) && raw.length === 0) {
      res.json(noUpdatePayload());
      return;
    }

    if (!raw || typeof raw !== 'object') {
      res.json(noUpdatePayload());
      return;
    }

    const data = raw as GitHubReleasePayload;
    const tagName =
      typeof data.tag_name === 'string' ? data.tag_name.trim() : '';

    if (!tagName) {
      res.json(noUpdatePayload());
      return;
    }

    const isUpdateAvailable = isRemoteVersionNewer(tagName, CURRENT_VERSION);

    if (!isUpdateAvailable) {
      res.json({
        currentVersion: CURRENT_VERSION,
        latestVersion: tagName,
        isUpdateAvailable: false,
        changelog: null,
        ...(typeof data.html_url === 'string' ? { htmlUrl: data.html_url } : {}),
      });
      return;
    }

    res.json({
      currentVersion: CURRENT_VERSION,
      latestVersion: tagName,
      isUpdateAvailable: true,
      changelog: typeof data.body === 'string' ? data.body : null,
      ...(typeof data.html_url === 'string' ? { htmlUrl: data.html_url } : {}),
    });
  } catch (error) {
    console.warn('[system] Version check failed:', error);
    res.json(noUpdatePayload());
  }
}
