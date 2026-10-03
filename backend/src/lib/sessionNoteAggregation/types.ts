export type AggregateTopicKind = 'ENTITY' | 'CONCEPT';

export interface AggregateDetectedEntity {
  /** Absolute offsets into the source note markdown. */
  start: number;
  end: number;
  pageId: string;
}

export interface AggregatePassage {
  noteId: string;
  authorId: string;
  start: number;
  end: number;
  detectedEntities: AggregateDetectedEntity[];
}

export interface AggregateTopic {
  id: string;
  label: string;
  kind: AggregateTopicKind;
  entityRef?: string;
  passages: AggregatePassage[];
}

export interface SessionNoteAggregateResult {
  notesWithContent: number;
  rosterCount: number;
  topics: AggregateTopic[];
  otherPassages: AggregatePassage[];
}

export interface AggregateKnownEntity {
  pageId: string;
  title: string;
  aliases: string[];
}

export interface AggregateNoteInput {
  noteId: string;
  authorId: string;
  markdown: string;
}

export interface AggregateSessionNotesInput {
  notes: AggregateNoteInput[];
  knownEntities: AggregateKnownEntity[];
  rosterCount: number;
}
