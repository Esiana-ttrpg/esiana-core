import { resolvePageIdentitySubtitle } from '@/lib/wikiPageHeaderMeta';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import type { WikiPlayerEntry, WikiTreeNode } from '@/types/wiki';

interface WikiPageIdentitySubtitleProps {
  pageId: string;
  profileKey: SurfaceProfileKey;
  templateType: string;
  profession?: string;
  knownFor?: string;
  players: WikiPlayerEntry[];
  flatPages: WikiTreeNode[];
}

export function WikiPageIdentitySubtitle({
  pageId,
  profileKey,
  templateType,
  profession,
  knownFor,
  players,
  flatPages,
}: WikiPageIdentitySubtitleProps) {
  const subtitle = resolvePageIdentitySubtitle({
    pageId,
    profileKey,
    templateType,
    profession,
    knownFor,
    players,
    flatPages,
  });

  if (!subtitle) return null;

  return (
    <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
  );
}
