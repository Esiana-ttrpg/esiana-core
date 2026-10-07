import {
  findPhraseMatches,
  findProtectedMarkdownRanges,
  splitParagraphs,
} from './markdownOffsets.js';
import { SESSION_NOTE_CONCEPT_VOCABULARY } from './sessionNoteConceptVocabulary.js';
import type {
  AggregateDetectedEntity,
  AggregateKnownEntity,
  AggregateNoteInput,
  AggregatePassage,
  AggregateSessionNotesInput,
  AggregateTopic,
  SessionNoteAggregateResult,
} from './types.js';

type MatchStrength = 'strong' | 'contextual';

interface TopicCandidateMatch {
  topicId: string;
  label: string;
  kind: 'ENTITY' | 'CONCEPT';
  entityRef?: string;
  strength: MatchStrength;
  phraseLength: number;
  offset: number;
  authorId: string;
  noteId: string;
  paragraphStart: number;
  paragraphEnd: number;
}

interface ParagraphKey {
  noteId: string;
  start: number;
  end: number;
  authorId: string;
}

function paragraphKey(p: ParagraphKey): string {
  return `${p.noteId}:${p.start}:${p.end}`;
}

function buildEntityPhrases(
  entities: AggregateKnownEntity[],
): Array<{ pageId: string; title: string; phrase: string }> {
  const rows: Array<{ pageId: string; title: string; phrase: string }> = [];
  for (const entity of entities) {
    const phrases = [entity.title, ...entity.aliases]
      .map((p) => p.trim())
      .filter(Boolean);
    const seen = new Set<string>();
    for (const phrase of phrases) {
      const key = phrase.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ pageId: entity.pageId, title: entity.title, phrase });
    }
  }
  rows.sort((a, b) => b.phrase.length - a.phrase.length);
  return rows;
}

function collectConceptMatches(
  paragraphText: string,
  absoluteStart: number,
  protectedRanges: ReturnType<typeof findProtectedMarkdownRanges>,
  noteId: string,
  authorId: string,
  paragraphStart: number,
  paragraphEnd: number,
): TopicCandidateMatch[] {
  const matches: TopicCandidateMatch[] = [];
  for (const concept of SESSION_NOTE_CONCEPT_VOCABULARY) {
    const strongPhrases = [...concept.strong].sort(
      (a, b) => b.length - a.length,
    );
    const contextualPhrases = [...concept.contextual].sort(
      (a, b) => b.length - a.length,
    );

    let bestStrong: { phraseLength: number; offset: number } | null = null;
    for (const phrase of strongPhrases) {
      const hits = findPhraseMatches(paragraphText, phrase, protectedRanges);
      for (const hit of hits) {
        if (!bestStrong || hit.start < bestStrong.offset) {
          bestStrong = {
            phraseLength: phrase.length,
            offset: absoluteStart + hit.start,
          };
        }
      }
    }

    if (!bestStrong) continue;

    let bestContextual: { phraseLength: number; offset: number } | null = null;
    for (const phrase of contextualPhrases) {
      const hits = findPhraseMatches(paragraphText, phrase, protectedRanges);
      for (const hit of hits) {
        if (!bestContextual || hit.start < bestContextual.offset) {
          bestContextual = {
            phraseLength: phrase.length,
            offset: absoluteStart + hit.start,
          };
        }
      }
    }

    matches.push({
      topicId: concept.id,
      label: concept.label,
      kind: 'CONCEPT',
      strength: 'strong',
      phraseLength: Math.max(
        bestStrong.phraseLength,
        bestContextual?.phraseLength ?? 0,
      ),
      offset: bestStrong.offset,
      authorId,
      noteId,
      paragraphStart,
      paragraphEnd,
    });
  }
  return matches;
}

function collectEntityMatches(
  paragraphText: string,
  absoluteStart: number,
  protectedRanges: ReturnType<typeof findProtectedMarkdownRanges>,
  entityPhrases: Array<{ pageId: string; title: string; phrase: string }>,
  noteId: string,
  authorId: string,
  paragraphStart: number,
  paragraphEnd: number,
): {
  topicMatches: TopicCandidateMatch[];
  detected: AggregateDetectedEntity[];
} {
  const topicMatches: TopicCandidateMatch[] = [];
  const detected: AggregateDetectedEntity[] = [];
  const covered = new Set<string>();

  for (const row of entityPhrases) {
    const hits = findPhraseMatches(paragraphText, row.phrase, protectedRanges);
    for (const hit of hits) {
      const absStart = absoluteStart + hit.start;
      const absEnd = absoluteStart + hit.end;
      const coverKey = `${absStart}:${absEnd}`;
      // Prefer longer phrases already sorted; skip overlaps with earlier detections
      const overlapsExisting = detected.some(
        (d) => absStart < d.end && absEnd > d.start,
      );
      if (overlapsExisting) continue;

      detected.push({ start: absStart, end: absEnd, pageId: row.pageId });

      const topicId = `entity:${row.pageId}`;
      if (!covered.has(topicId)) {
        covered.add(topicId);
        topicMatches.push({
          topicId,
          label: row.title,
          kind: 'ENTITY',
          entityRef: row.pageId,
          strength: 'strong',
          phraseLength: row.phrase.length,
          offset: absStart,
          authorId,
          noteId,
          paragraphStart,
          paragraphEnd,
        });
      }
    }
  }

  return { topicMatches, detected };
}

function strengthRank(strength: MatchStrength): number {
  return strength === 'strong' ? 2 : 1;
}

export function aggregateSessionNotes(
  input: AggregateSessionNotesInput,
): SessionNoteAggregateResult {
  const notes = input.notes.filter((n) => n.markdown.trim().length > 0);
  const notesWithContent = notes.length;
  const rosterCount = input.rosterCount;
  const entityPhrases = buildEntityPhrases(input.knownEntities);

  const allCandidateMatches: TopicCandidateMatch[] = [];
  const detectedByParagraph = new Map<string, AggregateDetectedEntity[]>();
  const paragraphs: ParagraphKey[] = [];

  for (const note of notes) {
    const protectedRanges = findProtectedMarkdownRanges(note.markdown);
    for (const para of splitParagraphs(note.markdown)) {
      const key = paragraphKey({
        noteId: note.noteId,
        start: para.start,
        end: para.end,
        authorId: note.authorId,
      });
      paragraphs.push({
        noteId: note.noteId,
        start: para.start,
        end: para.end,
        authorId: note.authorId,
      });

      // Remap protected ranges relative to paragraph for matching inside slice
      const relativeProtected = protectedRanges
        .filter((r) => r.start < para.end && r.end > para.start)
        .map((r) => ({
          start: Math.max(0, r.start - para.start),
          end: Math.min(para.text.length, r.end - para.start),
        }));

      const conceptMatches = collectConceptMatches(
        para.text,
        para.start,
        relativeProtected,
        note.noteId,
        note.authorId,
        para.start,
        para.end,
      );
      const { topicMatches: entityMatches, detected } = collectEntityMatches(
        para.text,
        para.start,
        relativeProtected,
        entityPhrases,
        note.noteId,
        note.authorId,
        para.start,
        para.end,
      );

      detectedByParagraph.set(key, detected);
      allCandidateMatches.push(...conceptMatches, ...entityMatches);
    }
  }

  // Author sets per topic from all candidate matches
  const authorsByTopic = new Map<string, Set<string>>();
  const metaByTopic = new Map<
    string,
    {
      label: string;
      kind: 'ENTITY' | 'CONCEPT';
      entityRef?: string;
    }
  >();

  for (const match of allCandidateMatches) {
    const set = authorsByTopic.get(match.topicId) ?? new Set<string>();
    set.add(match.authorId);
    authorsByTopic.set(match.topicId, set);
    if (!metaByTopic.has(match.topicId)) {
      metaByTopic.set(match.topicId, {
        label: match.label,
        kind: match.kind,
        entityRef: match.entityRef,
      });
    }
  }

  // Group matches by paragraph for primary assignment
  const matchesByParagraph = new Map<string, TopicCandidateMatch[]>();
  for (const match of allCandidateMatches) {
    const key = paragraphKey({
      noteId: match.noteId,
      start: match.paragraphStart,
      end: match.paragraphEnd,
      authorId: match.authorId,
    });
    const list = matchesByParagraph.get(key) ?? [];
    list.push(match);
    matchesByParagraph.set(key, list);
  }

  const passagesByTopic = new Map<string, AggregatePassage[]>();
  const assignedParagraphs = new Set<string>();
  const firstOccurrenceByTopic = new Map<string, number>();

  for (const para of paragraphs) {
    const key = paragraphKey(para);
    const candidates = matchesByParagraph.get(key) ?? [];
    if (candidates.length === 0) continue;

    candidates.sort((a, b) => {
      const authorsA = authorsByTopic.get(a.topicId)?.size ?? 0;
      const authorsB = authorsByTopic.get(b.topicId)?.size ?? 0;
      if (authorsB !== authorsA) return authorsB - authorsA;
      const strengthDiff = strengthRank(b.strength) - strengthRank(a.strength);
      if (strengthDiff !== 0) return strengthDiff;
      if (b.phraseLength !== a.phraseLength) return b.phraseLength - a.phraseLength;
      return a.offset - b.offset;
    });

    const primary = candidates[0]!;
    assignedParagraphs.add(key);

    const detected = detectedByParagraph.get(key) ?? [];
    const passage: AggregatePassage = {
      noteId: para.noteId,
      authorId: para.authorId,
      start: para.start,
      end: para.end,
      detectedEntities: detected,
    };

    const list = passagesByTopic.get(primary.topicId) ?? [];
    list.push(passage);
    passagesByTopic.set(primary.topicId, list);

    const noteIndex = notes.findIndex((n) => n.noteId === para.noteId);
    const occurrence = noteIndex * 1_000_000 + para.start;
    const prev = firstOccurrenceByTopic.get(primary.topicId);
    if (prev === undefined || occurrence < prev) {
      firstOccurrenceByTopic.set(primary.topicId, occurrence);
    }
  }

  const assignedAuthorsByTopic = new Map<string, Set<string>>();
  const survivingPassagesByTopic = new Map<string, AggregatePassage[]>();

  for (const [topicId, passages] of passagesByTopic) {
    const assignedAuthors = new Set(passages.map((p) => p.authorId));
    if (assignedAuthors.size < 2) {
      for (const passage of passages) {
        assignedParagraphs.delete(
          paragraphKey({
            noteId: passage.noteId,
            start: passage.start,
            end: passage.end,
            authorId: passage.authorId,
          }),
        );
      }
      continue;
    }
    assignedAuthorsByTopic.set(topicId, assignedAuthors);
    survivingPassagesByTopic.set(topicId, passages);
  }

  const topics: AggregateTopic[] = [...survivingPassagesByTopic.entries()]
    .map(([topicId, passages]) => {
      const meta = metaByTopic.get(topicId)!;
      return {
        id: topicId,
        label: meta.label,
        kind: meta.kind,
        ...(meta.entityRef ? { entityRef: meta.entityRef } : {}),
        passages,
      };
    })
    .sort((a, b) => {
      const authorsA = assignedAuthorsByTopic.get(a.id)?.size ?? 0;
      const authorsB = assignedAuthorsByTopic.get(b.id)?.size ?? 0;
      if (authorsB !== authorsA) return authorsB - authorsA;
      const occA = firstOccurrenceByTopic.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const occB = firstOccurrenceByTopic.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return occA - occB;
    });

  const otherPassages: AggregatePassage[] = [];
  for (const para of paragraphs) {
    const key = paragraphKey(para);
    if (assignedParagraphs.has(key)) continue;
    otherPassages.push({
      noteId: para.noteId,
      authorId: para.authorId,
      start: para.start,
      end: para.end,
      detectedEntities: detectedByParagraph.get(key) ?? [],
    });
  }

  return {
    notesWithContent,
    rosterCount,
    topics,
    otherPassages,
  };
}

/** Party-visible notes only: Public or Party visibility. */
export function isPartyVisibleSessionNoteVisibility(visibility: string): boolean {
  return visibility === 'Public' || visibility === 'Party';
}

export function toAggregateNotesFromColumns(
  columns: Array<{
    userId: string;
    pageId: string | null;
    markdown: string;
    visibility: string;
    masked: boolean;
    hasNotes: boolean;
  }>,
): AggregateNoteInput[] {
  const notes: AggregateNoteInput[] = [];
  for (const col of columns) {
    if (!col.pageId || col.masked || !col.hasNotes) continue;
    if (!isPartyVisibleSessionNoteVisibility(col.visibility)) continue;
    if (!col.markdown.trim()) continue;
    notes.push({
      noteId: col.pageId,
      authorId: col.userId,
      markdown: col.markdown,
    });
  }
  return notes;
}
