import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, Plus } from 'lucide-react';
import { MemberIdentityLabel } from '@/components/campaign/MemberIdentityLabel';
import { WikiMarkdown } from '@/components/wiki/WikiMarkdown';
import { WikiTipTapEditor } from '@/components/wiki/WikiTipTapEditor';
import { useWiki } from '@/contexts/WikiContext';
import { useAuth } from '@/contexts/AuthContext';
import { campaignWikiPath } from '@/lib/campaignPaths';
import {
  countWordsInPassage,
  enrichPassageMarkdownForDisplay,
} from '@/lib/sessionAggregateEnrichment';
import {
  ensureSessionAuthorNote,
  updateSessionNotePage,
} from '@/lib/wiki';
import { getSessionNoteMarkdown } from '@/utils/sessionNote';
import { CampaignMemberRoles } from '@/types/domain';
import type {
  AggregatePassage,
  AggregateTopic,
  CombinedSessionNotesPayload,
  SessionAuthorColumn,
} from '@/types/wiki';

interface SessionAggregateNotesViewProps {
  campaignHandle: string;
  payload: CombinedSessionNotesPayload;
  onRefresh?: () => void;
  /** When set, selecting an author can switch the multi-view sidebar. */
  onSelectAuthor?: (userId: string) => void;
}

function canModifyColumn(
  column: SessionAuthorColumn | undefined,
  currentUserId: string | null,
  role: string | null | undefined,
): boolean {
  if (!column?.pageId) return false;
  if (
    role === CampaignMemberRoles.GAMEMASTER ||
    role === CampaignMemberRoles.WRITER
  ) {
    return true;
  }
  return Boolean(currentUserId && column.userId === currentUserId);
}

function PassageBlock({
  campaignHandle,
  column,
  passage,
  canEdit,
  onEdit,
  onSelectAuthor,
}: {
  campaignHandle: string;
  column: SessionAuthorColumn | undefined;
  passage: AggregatePassage;
  canEdit: boolean;
  onEdit: () => void;
  onSelectAuthor?: (userId: string) => void;
}) {
  const markdown = column?.markdown ?? '';
  const slice = markdown.slice(passage.start, passage.end);
  const enriched = enrichPassageMarkdownForDisplay({
    fullMarkdown: markdown,
    start: passage.start,
    end: passage.end,
    detectedEntities: passage.detectedEntities,
    campaignHandle,
  });
  const wordCount = countWordsInPassage(slice);
  const labelSource = column ?? {
    label: 'Unknown',
    displayName: null,
    playerContext: '',
    identityPageId: null,
  };

  return (
    <section className="group/passage space-y-2">
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex min-w-0 items-center gap-2 text-left"
          onClick={() => onSelectAuthor?.(passage.authorId)}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
            <MemberIdentityLabel
              source={labelSource}
              primaryClassName="font-semibold uppercase tracking-wide text-foreground"
            />
          </span>
          <span className="text-xs text-muted">
            · {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
        </button>
        {canEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted opacity-100 transition-opacity hover:bg-surface hover:text-foreground md:opacity-0 md:group-hover/passage:opacity-100 md:group-focus-within/passage:opacity-100"
            aria-label="Edit note"
          >
            <Edit3 className="size-3.5" aria-hidden />
            Edit
          </button>
        ) : null}
      </header>
      <div className="prose prose-invert max-w-[68ch] text-sm">
        <WikiMarkdown content={enriched} />
      </div>
    </section>
  );
}

function TopicSection({
  campaignHandle,
  topic,
  columnsByUserId,
  columnsByPageId,
  currentUserId,
  role,
  onEditNote,
  onSelectAuthor,
}: {
  campaignHandle: string;
  topic: AggregateTopic;
  columnsByUserId: Map<string, SessionAuthorColumn>;
  columnsByPageId: Map<string, SessionAuthorColumn>;
  currentUserId: string | null;
  role: string | null | undefined;
  onEditNote: (pageId: string) => void;
  onSelectAuthor?: (userId: string) => void;
}) {
  const { flatPages } = useWiki();
  const heading =
    topic.entityRef ? (
      <Link
        to={campaignWikiPath(campaignHandle, topic.entityRef, flatPages)}
        className="text-lg font-semibold text-foreground hover:text-primary"
      >
        {topic.label}
      </Link>
    ) : (
      <h2 className="text-lg font-semibold text-foreground">{topic.label}</h2>
    );

  return (
    <section className="space-y-5">
      {heading}
      <div className="space-y-6">
        {topic.passages.map((passage) => {
          const column =
            columnsByPageId.get(passage.noteId) ??
            columnsByUserId.get(passage.authorId);
          return (
            <PassageBlock
              key={`${passage.noteId}:${passage.start}:${passage.end}`}
              campaignHandle={campaignHandle}
              column={column}
              passage={passage}
              canEdit={canModifyColumn(column, currentUserId, role)}
              onEdit={() => column?.pageId && onEditNote(column.pageId)}
              onSelectAuthor={onSelectAuthor}
            />
          );
        })}
      </div>
    </section>
  );
}

function AuthorSeparatedProse({
  campaignHandle,
  columns,
  currentUserId,
  role,
  onEditNote,
  onSelectAuthor,
}: {
  campaignHandle: string;
  columns: SessionAuthorColumn[];
  currentUserId: string | null;
  role: string | null | undefined;
  onEditNote: (pageId: string) => void;
  onSelectAuthor?: (userId: string) => void;
}) {
  const partyColumns = columns.filter(
    (c) =>
      !c.masked &&
      c.hasNotes &&
      (c.visibility === 'Party' || c.visibility === 'Public'),
  );

  return (
    <div className="space-y-8">
      {partyColumns.map((column) => {
        const wordCount = countWordsInPassage(column.markdown);
        return (
          <section key={column.userId} className="group/passage space-y-2">
            <header className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="inline-flex min-w-0 items-center gap-2 text-left"
                onClick={() => onSelectAuthor?.(column.userId)}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  <MemberIdentityLabel
                    source={column}
                    primaryClassName="font-semibold uppercase tracking-wide text-foreground"
                  />
                </span>
                <span className="text-xs text-muted">
                  · {wordCount} {wordCount === 1 ? 'word' : 'words'}
                </span>
              </button>
              {canModifyColumn(column, currentUserId, role) && column.pageId ? (
                <button
                  type="button"
                  onClick={() => onEditNote(column.pageId!)}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted opacity-100 transition-opacity hover:bg-surface hover:text-foreground md:opacity-0 md:group-hover/passage:opacity-100 md:group-focus-within/passage:opacity-100"
                >
                  <Edit3 className="size-3.5" aria-hidden />
                  Edit
                </button>
              ) : null}
            </header>
            <div className="prose prose-invert max-w-[68ch] text-sm">
              <WikiMarkdown content={column.markdown} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function SessionAggregateNotesView({
  campaignHandle,
  payload,
  onRefresh,
  onSelectAuthor,
}: SessionAggregateNotesViewProps) {
  const { user } = useAuth();
  const { campaign, tree } = useWiki();
  const currentUserId = user?.id ?? null;
  const role = campaign?.role;
  const aggregate = payload.aggregate;

  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const columnsByUserId = useMemo(() => {
    const map = new Map<string, SessionAuthorColumn>();
    for (const col of payload.columns) map.set(col.userId, col);
    return map;
  }, [payload.columns]);

  const columnsByPageId = useMemo(() => {
    const map = new Map<string, SessionAuthorColumn>();
    for (const col of payload.columns) {
      if (col.pageId) map.set(col.pageId, col);
    }
    return map;
  }, [payload.columns]);

  const timelinePointId = payload.session.timelinePointId;
  const notesWithContent = aggregate?.notesWithContent ?? 0;
  const topics = aggregate?.topics ?? [];
  const otherPassages = aggregate?.otherPassages ?? [];

  async function openEdit(pageId: string) {
    const col = columnsByPageId.get(pageId);
    setEditingPageId(pageId);
    setEditContent(col?.markdown ?? '');
    setShowAdd(false);
  }

  async function saveEdit() {
    if (!editingPageId) return;
    setSaving(true);
    try {
      await updateSessionNotePage(campaignHandle, editingPageId, {
        content: editContent,
      });
      setEditingPageId(null);
      onRefresh?.();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to save note');
    } finally {
      setSaving(false);
    }
  }

  async function submitAddToMyNotes() {
    if (!timelinePointId || !addDraft.trim()) return;
    setAdding(true);
    try {
      const ensured = await ensureSessionAuthorNote(
        campaignHandle,
        timelinePointId,
      );
      const pageId = ensured.page.id;
      const blocks = ensured.page.blocks;
      if (!Array.isArray(blocks)) {
        window.alert('Unable to read your session note. Please try again.');
        return;
      }
      const body =
        blocks.find((block) => block.id === 'session-note-body') ??
        blocks.find((block) => block.type === 'text-tiptap');
      if (!body) {
        window.alert('Unable to read your session note. Please try again.');
        return;
      }
      const markdown = (body.content as { markdown?: unknown } | undefined)
        ?.markdown;
      if (typeof markdown !== 'string') {
        window.alert('Unable to read your session note. Please try again.');
        return;
      }
      const existing = getSessionNoteMarkdown(blocks).trim();
      const next = existing
        ? `${existing}\n\n${addDraft.trim()}`
        : addDraft.trim();
      await updateSessionNotePage(campaignHandle, pageId, { content: next });
      setAddDraft('');
      setShowAdd(false);
      onRefresh?.();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'Unable to add to your notes',
      );
    } finally {
      setAdding(false);
    }
  }

  if (editingPageId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted">Editing source note</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
              onClick={() => setEditingPageId(null)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-primary/15 px-3 py-1.5 text-sm text-primary hover:bg-primary/25"
              onClick={() => void saveEdit()}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
        <WikiTipTapEditor
          content={editContent}
          onChange={setEditContent}
          wikiTree={tree}
        />
      </div>
    );
  }

  const body = (() => {
    if (notesWithContent === 0) {
      return (
        <p className="text-sm italic text-muted">
          No party notes for this session yet.
        </p>
      );
    }

    if (topics.length === 0) {
      return (
        <AuthorSeparatedProse
          campaignHandle={campaignHandle}
          columns={payload.columns}
          currentUserId={currentUserId}
          role={role}
          onEditNote={(pageId) => void openEdit(pageId)}
          onSelectAuthor={onSelectAuthor}
        />
      );
    }

    return (
      <div className="space-y-10">
        {topics.map((topic, index) => (
          <div key={topic.id} className="space-y-10">
            {index > 0 ? (
              <hr className="border-border" aria-hidden />
            ) : null}
            <TopicSection
              campaignHandle={campaignHandle}
              topic={topic}
              columnsByUserId={columnsByUserId}
              columnsByPageId={columnsByPageId}
              currentUserId={currentUserId}
              role={role}
              onEditNote={(pageId) => void openEdit(pageId)}
              onSelectAuthor={onSelectAuthor}
            />
          </div>
        ))}
        {otherPassages.length > 0 ? (
          <div className="space-y-10">
            <hr className="border-border" aria-hidden />
            <section className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">
                Other Notes
              </h2>
              <div className="space-y-6">
                {otherPassages.map((passage) => {
                  const column =
                    columnsByPageId.get(passage.noteId) ??
                    columnsByUserId.get(passage.authorId);
                  return (
                    <PassageBlock
                      key={`${passage.noteId}:${passage.start}:${passage.end}`}
                      campaignHandle={campaignHandle}
                      column={column}
                      passage={passage}
                      canEdit={canModifyColumn(column, currentUserId, role)}
                      onEdit={() =>
                        column?.pageId && void openEdit(column.pageId)
                      }
                      onSelectAuthor={onSelectAuthor}
                    />
                  );
                })}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    );
  })();

  return (
    <div className="space-y-8">
      {body}
      <div className="border-t border-border pt-4">
        {showAdd ? (
          <div className="space-y-3">
            <textarea
              value={addDraft}
              onChange={(e) => setAddDraft(e.target.value)}
              rows={4}
              className="w-full max-w-[68ch] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              placeholder="Something you remembered…"
              aria-label="Add to my notes"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
                onClick={() => {
                  setShowAdd(false);
                  setAddDraft('');
                }}
                disabled={adding}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-primary/15 px-3 py-1.5 text-sm text-primary hover:bg-primary/25"
                onClick={() => void submitAddToMyNotes()}
                disabled={adding || !addDraft.trim() || !timelinePointId}
              >
                {adding ? 'Saving…' : 'Save to my notes'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            disabled={!timelinePointId}
          >
            <Plus className="size-4" aria-hidden />
            Add to my notes
          </button>
        )}
      </div>
    </div>
  );
}
