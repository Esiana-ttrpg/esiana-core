import { parseSceneMetadata } from '@/lib/sceneMetadata';
import { parseThreadMetadata } from '@/lib/threadMetadata';
import type { BlockSemanticIndexAdapter } from '../types';
import { joinIndexParts } from '../utils';

export const narrativePropertiesAdapter: BlockSemanticIndexAdapter = ({ block, pageMetadata }) => {
  if (block.type === 'entity-thread-properties') {
    const thread = parseThreadMetadata(pageMetadata);
    return {
      semanticIndexText: joinIndexParts([
        thread.threadKind,
        thread.threadStatus,
        thread.narrativeWeight,
        thread.emotionalResidueKind,
      ]),
      semanticKeywords: [
        thread.threadKind,
        thread.threadStatus,
        thread.narrativeWeight,
        thread.emotionalResidueKind,
      ].filter((k): k is NonNullable<typeof thread.emotionalResidueKind> => Boolean(k?.trim())),
      semanticReferences: [
        ...thread.relatedPageIds,
        thread.payoffPageId,
      ].filter((id): id is string => Boolean(id)),
    };
  }

  const scene = parseSceneMetadata(pageMetadata);
  return {
    semanticIndexText: joinIndexParts([
      scene.summary,
      scene.tone,
      scene.sceneKind,
      scene.sceneStatus,
      scene.narrativeWeight,
      scene.beatType,
      ...scene.pacingTags,
      scene.gmNotes,
    ]),
    semanticKeywords: [
      scene.tone,
      scene.sceneKind,
      scene.sceneStatus,
      scene.narrativeWeight,
      scene.beatType,
      ...scene.pacingTags,
    ].filter((k): k is string => Boolean(k?.trim())),
    semanticReferences: [
      ...scene.participantPageIds,
      scene.locationPageId,
      ...scene.linkedQuestPageIds,
      ...scene.linkedObjectivePageIds,
      ...scene.linkedCluePageIds,
      ...scene.linkedThreadPageIds,
      ...scene.consequencePageIds,
      ...scene.followsScenePageIds,
    ].filter((id): id is string => Boolean(id)),
  };
};
