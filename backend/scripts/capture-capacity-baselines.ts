#!/usr/bin/env tsx
/**
 * Seed benchmark profiles and capture capacity baselines for this machine.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, isSampleDataEnabled } from '../src/config/env.js';
import { signAuthToken } from '../src/middleware/auth.js';
import {
  generateApiTokenSecret,
  hashApiToken,
  computeTokenExpiry,
} from '../src/lib/apiToken.js';
import { generateHandle, makeUniqueHandle } from '../src/lib/handleUtils.js';
import { seedWikiSkeleton } from '../src/lib/seedWiki.js';
import { getDefaultSidebarConfig } from '../src/lib/sidebarConfig.js';
import { getDefaultDashboardConfig } from '../src/lib/dashboardConfig.js';
import { DEFAULT_GAME_SYSTEM_SLUG } from '../src/lib/gameSystems.js';
import { CampaignMemberRoles } from '../src/types/domain.js';
import { generateInviteToken } from '../src/lib/inviteToken.js';
import { toInputJsonValue } from '../src/lib/inputJsonValue.js';
import {
  CAPACITY_SCENARIO_IDS,
  reportToMarkdown,
} from '../src/lib/capacityProfiling/reportTypes.js';
import { runCapacityProfile } from '../src/lib/capacityProfiling/runCapacityProfile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(BACKEND_ROOT, '..');
const BASELINES_DIR = path.join(REPO_ROOT, 'docs/capacity/baselines');
const BASE_URL = process.env.ESIANA_BASE_URL ?? `http://127.0.0.1:${env.port}`;

const PROFILES: { profileId: string; outputFile: string; label: string; handle: string }[] = [
  {
    profileId: 'benchmark-small',
    outputFile: 'dev-machine-small.json',
    label: 'Small',
    handle: 'dev-benchmark-small',
  },
  {
    profileId: 'benchmark-medium',
    outputFile: 'dev-machine-medium.json',
    label: 'Medium',
    handle: 'dev-benchmark-medium',
  },
  {
    profileId: 'benchmark-large',
    outputFile: 'dev-machine-large.json',
    label: 'Large',
    handle: 'dev-benchmark-large',
  },
];

interface AuthBundle {
  apiToken: string;
  userId: string;
}

function runCommand(
  command: string,
  args: string[],
  extraEnv: Record<string, string> = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: BACKEND_ROOT,
      env: { ...process.env, ENABLE_SAMPLE_DATA: 'true', ...extraEnv },
      shell: true,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function prepareAuth(): Promise<AuthBundle> {
  const { prisma } = await import('../src/lib/prisma.js');
  try {
    const admin = await prisma.user.findFirst({
      where: { role: 'SYSTEM_ADMIN' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true },
    });
    if (!admin) {
      throw new Error('No SYSTEM_ADMIN user found. Register the first account at /register first.');
    }

    const rawToken = generateApiTokenSecret();
    await prisma.userToken.create({
      data: {
        userId: admin.id,
        name: `capacity-baseline-${Date.now()}`,
        tokenHash: hashApiToken(rawToken),
        scopes: [],
        expiresAt: computeTokenExpiry(30),
      },
    });

    console.error(`Prepared API token for ${admin.email}`);
    return { apiToken: rawToken, userId: admin.id };
  } finally {
    await prisma.$disconnect();
  }
}

async function ensureCampaign(handle: string, userId: string, title: string): Promise<void> {
  const { prisma } = await import('../src/lib/prisma.js');
  try {
    const existing = await prisma.campaign.findUnique({ where: { handle }, select: { id: true } });
    if (existing) {
      console.error(`Campaign ${handle} already exists — reusing`);
      return;
    }

    await prisma.$transaction(async (tx) => {
      const created = await tx.campaign.create({
        data: {
          name: title,
          handle,
          inviteToken: generateInviteToken(),
          campaignOwnerUserId: userId,
          gameSystem: DEFAULT_GAME_SYSTEM_SLUG,
          sidebarConfig: toInputJsonValue(getDefaultSidebarConfig()),
          dashboardConfig: toInputJsonValue(getDefaultDashboardConfig()),
        },
        select: { id: true },
      });

      const { ensureDefaultPartyForCampaign, linkCampaignMembersToDefaultParty } =
        await import('../src/lib/partyService.js');
      const partyId = await ensureDefaultPartyForCampaign(tx, created.id, title);
      await linkCampaignMembersToDefaultParty(tx, created.id, partyId);

      await tx.campaignMember.create({
        data: {
          userId,
          campaignId: created.id,
          role: CampaignMemberRoles.GAMEMASTER,
          chronologyContributor: false,
          partyId,
        },
      });

      await seedWikiSkeleton(tx, created.id);
    });
    console.error(`Created campaign ${handle}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function waitForBackend(maxWaitMs = 120_000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Backend not reachable at ${BASE_URL} after ${maxWaitMs}ms`);
}

function startBackend(): ChildProcess {
  console.error('Starting backend…');
  return spawn('npm', ['run', 'dev'], {
    cwd: BACKEND_ROOT,
    env: { ...process.env, ENABLE_SAMPLE_DATA: 'true' },
    shell: true,
    stdio: 'ignore',
  });
}

async function seedProfile(auth: AuthBundle, profileId: string, handle: string): Promise<void> {
  console.error(`Seeding ${profileId} → ${handle} …`);
  await runCommand('npm', [
    'run',
    'seed-campaign',
    '--',
    '--token',
    auth.apiToken,
    '--slug',
    handle,
    '--profile',
    profileId,
    '--concurrency',
    profileId === 'benchmark-large' ? '8' : profileId === 'benchmark-medium' ? '6' : '4',
  ], {
    ESIANA_SEED_TOKEN: auth.apiToken,
    ESIANA_BASE_URL: BASE_URL,
  });
}

async function main(): Promise<void> {
  if (!isSampleDataEnabled()) {
    process.env.ENABLE_SAMPLE_DATA = 'true';
  }

  const auth = await prepareAuth();
  for (const profile of PROFILES) {
    await ensureCampaign(profile.handle, auth.userId, `Dev ${profile.label} Benchmark`);
  }

  const child = startBackend();
  await waitForBackend();

  const scenarios = CAPACITY_SCENARIO_IDS.filter((id) => id !== 'import');
  await mkdir(BASELINES_DIR, { recursive: true });

  try {
    for (const { profileId, outputFile, label, handle } of PROFILES) {
      console.error(`\n=== ${label} (${profileId}) ===`);
      await seedProfile(auth, profileId, handle);

      const report = await runCapacityProfile({
        baseUrl: BASE_URL,
        token: auth.apiToken,
        campaignHandle: handle,
        iterations: 3,
        scenarios,
      });

      report.environment = {
        ...report.environment,
        platform: `${process.platform} ${process.arch}`,
        nodeVersion: process.version,
        db: env.databaseProvider,
        profileId,
        label,
        campaignHandle: handle,
      };

      const jsonPath = path.join(BASELINES_DIR, outputFile);
      await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
      const mdPath = jsonPath.replace(/\.json$/i, '.md');
      await writeFile(mdPath, `${reportToMarkdown(report)}\n`, 'utf8');
      console.error(`Wrote ${jsonPath}`);
    }
  } finally {
    child.kill();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
