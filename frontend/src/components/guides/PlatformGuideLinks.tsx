import { Link } from 'react-router-dom';
import {
  PLATFORM_GUIDES,
  platformGuidePath,
  type PlatformGuideSlug,
} from '@/lib/platformGuides';

interface PlatformGuideLinksProps {
  slugs?: PlatformGuideSlug[];
  className?: string;
}

export function PlatformGuideLinks({ slugs, className = '' }: PlatformGuideLinksProps) {
  const guides =
    slugs != null
      ? PLATFORM_GUIDES.filter((guide) => slugs.includes(guide.slug))
      : PLATFORM_GUIDES;

  if (guides.length === 0) return null;

  return (
    <nav
      className={`flex flex-wrap items-center justify-end gap-2 sm:gap-3 ${className}`.trim()}
      aria-label="Platform guides"
    >
      {guides.map((guide, index) => (
        <span key={guide.slug} className="inline-flex items-center gap-2 sm:gap-3">
          {index > 0 ? (
            <span className="hidden text-muted sm:inline" aria-hidden>
              •
            </span>
          ) : null}
          <Link
            to={platformGuidePath(guide.slug)}
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            {guide.title}
          </Link>
        </span>
      ))}
    </nav>
  );
}
