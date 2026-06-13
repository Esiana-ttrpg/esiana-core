import gettingStartedRaw from '@/content/guides/getting-started.md?raw';
import tableGuideRaw from '@/content/guides/table-guide.md?raw';
import joiningProcessRaw from '@/content/guides/joining-process.md?raw';
import safetyAndComfortRaw from '@/content/guides/safety-and-comfort.md?raw';
import worldDevelopmentRaw from '@/content/guides/world-development.md?raw';

export type PlatformGuideSlug =
  | 'getting-started'
  | 'table-guide'
  | 'joining-process'
  | 'safety-and-comfort'
  | 'world-development';

export type PlatformGuide = {
  slug: PlatformGuideSlug;
  title: string;
  body: string;
};

export const PLATFORM_GUIDES: PlatformGuide[] = [
  { slug: 'getting-started', title: 'Getting Started', body: gettingStartedRaw },
  { slug: 'table-guide', title: 'Table Guide', body: tableGuideRaw },
  { slug: 'joining-process', title: 'Joining Process', body: joiningProcessRaw },
  { slug: 'safety-and-comfort', title: 'Safety & Comfort', body: safetyAndComfortRaw },
  { slug: 'world-development', title: 'World Development', body: worldDevelopmentRaw },
];

export const RECRUITMENT_DIRECTORY_GUIDE_SLUGS: PlatformGuideSlug[] = [
  'table-guide',
  'safety-and-comfort',
  'joining-process',
];

export function platformGuidePath(slug: PlatformGuideSlug): string {
  return `/guides/${slug}`;
}

export function getPlatformGuide(slug: string): PlatformGuide | undefined {
  return PLATFORM_GUIDES.find((guide) => guide.slug === slug);
}
