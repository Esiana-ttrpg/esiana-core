import type { ReactNode } from 'react';
import { ImmatureTabPlaceholder } from './ImmatureTabPlaceholder';
import type { EntityPageShellViewProps } from '@/lib/entityPageShells/types';

export type ImmatureTabPlaceholderDef = {
  title: string;
  description: string;
};

export interface SharedEntityPageShellViewProps {
  hero: ReactNode;
  overview: ReactNode;
  pageSubview: EntityPageShellViewProps['pageSubview'];
  displayBlocks: EntityPageShellViewProps['displayBlocks'];
  wikiPageRenderer: EntityPageShellViewProps['wikiPageRenderer'];
  continuityPanel?: EntityPageShellViewProps['continuityPanel'];
  immatureTabPlaceholders?: Record<string, ImmatureTabPlaceholderDef>;
}

export function EntityPageShellView({
  hero,
  overview,
  pageSubview,
  displayBlocks,
  wikiPageRenderer,
  continuityPanel,
  immatureTabPlaceholders = {},
}: SharedEntityPageShellViewProps) {
  const immature = immatureTabPlaceholders[pageSubview];
  const hasContentBlocks = displayBlocks.length > 0;

  function renderContentTab() {
    if (pageSubview === 'continuity' && continuityPanel) {
      return (
        <>
          {continuityPanel}
          {hasContentBlocks ? wikiPageRenderer : null}
        </>
      );
    }
    if (immature && !hasContentBlocks) {
      return (
        <ImmatureTabPlaceholder
          title={immature.title}
          description={immature.description}
        />
      );
    }
    return wikiPageRenderer;
  }

  return (
    <div className="min-w-0">
      {hero}
      {pageSubview === 'overview' ? overview : renderContentTab()}
    </div>
  );
}
