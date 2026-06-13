import { Link } from 'react-router-dom';
import { charactersOfAncestry } from '@/lib/charactersOfAncestry';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { pageTitleById } from '@/lib/ancestryMetadata';
import type { WikiTreeNode } from '@/types/wiki';

interface AncestryCharactersTabProps {
  campaignHandle: string;
  pageId: string;
  flatPages: WikiTreeNode[];
}

export function AncestryCharactersTab({
  campaignHandle,
  pageId,
  flatPages,
}: AncestryCharactersTabProps) {
  const characters = charactersOfAncestry(pageId, flatPages);

  if (characters.length === 0) {
    return (
      <p className="text-sm text-muted">
        No characters are linked to this ancestry or its lineages yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/50 rounded-lg border border-border/60 bg-surface/40">
      {characters.map((character) => {
        const locationTitle = pageTitleById(flatPages, character.currentLocationId);
        const lineageTitle = character.lineageId
          ? pageTitleById(flatPages, character.lineageId)
          : null;

        return (
          <li key={character.pageId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div>
              <Link
                to={campaignWikiPath(campaignHandle, character.pageId, flatPages)}
                className="font-medium text-primary hover:underline"
              >
                {character.title}
              </Link>
              {lineageTitle ? (
                <p className="mt-0.5 text-xs text-muted">Lineage: {lineageTitle}</p>
              ) : null}
            </div>
            {locationTitle ? (
              <span className="text-xs text-muted">{locationTitle}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
