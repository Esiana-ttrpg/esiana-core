import {
  mapMemberToIdentityFields,
  type IdentityPageRef,
} from './memberIdentity.js';
import { parseCharacterMetadata } from './characterMetadata.js';
import {
  parseSessionNoteMetadata,
  getSessionNoteAuthorId,
} from './sessionNoteMetadata.js';
import {
  canViewPageVisibility,
  extractSessionNoteMarkdown,
  pageMatchesSessionGroup,
} from './sessionNotesCombined.js';

export interface SessionNotesAttendanceCell {
  pageId: string | null;
  hasNotes: boolean;
}

export interface SessionNotesAttendanceMember {
  userId: string;
  role: string;
  playerContext: string;
  /** Player / account display name for the header's first row. */
  label: string;
  /** Character identity page title when visible; otherwise null. */
  displayName: string | null;
  identityPageId: string | null;
  /** Resolved portrait URL from character metadata when identity is visible. */
  identityPortrait: string | null;
}

export interface SessionNotesAttendanceSession {
  timelinePointId: string;
  pageId: string;
  title: string;
  sequenceOrder: number;
  cells: Record<string, SessionNotesAttendanceCell>;
}

export interface SessionNotesAttendancePayload {
  members: SessionNotesAttendanceMember[];
  sessions: SessionNotesAttendanceSession[];
  currentTimelinePointId: string | null;
}

export type SessionNotesAttendanceTimelineRow = {
  id: string;
  sequenceOrder: number;
  wikiPage: {
    id: string;
    title: string;
    metadata: unknown;
    visibility: string;
  } | null;
};

export type SessionNotesAttendanceAuthorPage = {
  id: string;
  metadata: unknown;
  blocks: unknown;
  visibility: string;
};

export type SessionNotesAttendanceMemberInput = {
  userId: string;
  role: string;
  user: { email: string; displayName?: string | null };
  identityPage?: (IdentityPageRef & { metadata?: unknown }) | null;
};

const EMPTY_CELL: SessionNotesAttendanceCell = {
  pageId: null,
  hasNotes: false,
};

export function buildSessionNotesAttendance(params: {
  timelineRows: SessionNotesAttendanceTimelineRow[];
  authorPages: SessionNotesAttendanceAuthorPage[];
  members: SessionNotesAttendanceMemberInput[];
  canManage: boolean;
}): SessionNotesAttendancePayload {
  const members: SessionNotesAttendanceMember[] = params.members.map(
    (member, index) => {
      const identityPage = member.identityPage ?? null;
      const identityVisible =
        identityPage != null &&
        canViewPageVisibility(identityPage.visibility, params.canManage);
      const visibleIdentity = identityVisible ? identityPage : null;
      const mapped = mapMemberToIdentityFields(
        {
          userId: member.userId,
          role: member.role,
          user: member.user,
          identityPage: visibleIdentity,
        },
        index,
      );
      const identityPortrait =
        visibleIdentity != null
          ? parseCharacterMetadata(visibleIdentity.metadata).appearance
              .portraitUrl
          : null;

      return {
        userId: mapped.userId,
        role: mapped.role,
        playerContext: mapped.playerContext,
        // Attendance header row 1 is always the player/account label.
        label: mapped.playerContext,
        displayName: mapped.displayName,
        identityPageId: mapped.identityPageId,
        identityPortrait,
      };
    },
  );

  const visibleSessions = params.timelineRows
    .filter((row) => {
      const anchor = row.wikiPage;
      if (!anchor) return false;
      return canViewPageVisibility(anchor.visibility, params.canManage);
    })
    .sort((a, b) => {
      if (b.sequenceOrder !== a.sequenceOrder) {
        return b.sequenceOrder - a.sequenceOrder;
      }
      return b.id.localeCompare(a.id);
    });

  const sessions: SessionNotesAttendanceSession[] = visibleSessions.map(
    (row) => {
      const anchor = row.wikiPage!;
      const anchorMeta = parseSessionNoteMetadata(anchor.metadata);
      const sessionGroupId = anchorMeta.sessionGroupId ?? row.id;
      const sessionAuthorPages = params.authorPages.filter((page) =>
        pageMatchesSessionGroup(page.metadata, sessionGroupId, row.id),
      );

      const cells: Record<string, SessionNotesAttendanceCell> = {};
      for (const member of members) {
        cells[member.userId] = { ...EMPTY_CELL };
      }

      for (const page of sessionAuthorPages) {
        if (!canViewPageVisibility(page.visibility, params.canManage)) {
          continue;
        }
        const authorId = getSessionNoteAuthorId(page.metadata);
        if (!authorId || !(authorId in cells)) continue;
        const hasNotes = extractSessionNoteMarkdown(page.blocks).length > 0;
        cells[authorId] = {
          pageId: page.id,
          hasNotes,
        };
      }

      return {
        timelinePointId: row.id,
        pageId: anchor.id,
        title: anchor.title,
        sequenceOrder: row.sequenceOrder,
        cells,
      };
    },
  );

  return {
    members,
    sessions,
    currentTimelinePointId: sessions[0]?.timelinePointId ?? null,
  };
}
