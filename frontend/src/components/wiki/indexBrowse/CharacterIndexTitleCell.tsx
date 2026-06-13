import { Link } from 'react-router-dom';
import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import {
  formatCharacterDisplayName,
  truncateKnownFor,
} from '@/lib/characterDisplayName';

interface CharacterIndexTitleCellProps {
  campaignHandle: string;
  categoryTitle: string;
  pageId: string;
  title: string;
  pronouns?: string | null;
  knownFor?: string | null;
  /** Hub cast board — name is not a link; row click selects, double-click opens */
  previewMode?: boolean;
}

/**
 * Name-first identity cell for Characters operator table — no status badge or location trail.
 */
export function CharacterIndexTitleCell({
  campaignHandle,
  categoryTitle,
  pageId,
  title,
  pronouns,
  knownFor,
  previewMode = false,
}: CharacterIndexTitleCellProps) {
  const { flatPages } = useWiki();
  const displayName = formatCharacterDisplayName(title, pronouns);

  const nameBlock = (
    <>
      <span
        className={`text-sm font-semibold break-words ${
          previewMode ? 'text-focal-foreground' : 'text-primary'
        }`}
        aria-label={displayName.ariaLabel}
      >
        {displayName.primary}
        {displayName.pronounSuffix ? (
          <span className="ml-1 font-normal text-muted">
            ({displayName.pronounSuffix})
          </span>
        ) : null}
      </span>
      {knownFor?.trim() ? (
        <span className="mt-0.5 hidden text-xs italic text-muted xl:block">
          {truncateKnownFor(knownFor, 60)}
        </span>
      ) : null}
    </>
  );

  if (previewMode) {
    return <div className="block min-w-0">{nameBlock}</div>;
  }

  return (
    <Link
      to={campaignCategoryChildPath(campaignHandle, pageId, categoryTitle, flatPages)}
      className="block min-w-0 hover:text-primary"
    >
      {nameBlock}
    </Link>
  );
}
