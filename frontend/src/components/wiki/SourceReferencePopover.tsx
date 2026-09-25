import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import type { SourceReference } from '@shared/sourceReferences';
import { encodeSourceReference } from '@shared/sourceReferences';
import { fetchSourceOpenTarget, resolveSource } from '@/lib/sourceReferencesApi';
import { findSourceReferenceRange } from './extensions/sourceReferenceRange';

export interface SourceInteraction {
  editor: Editor;
  pos: number;
  payload: string;
  reference: SourceReference;
  atom: boolean;
  rect: DOMRect;
}

export function SourceReferencePopover({ campaignId, interaction, onClose }: { campaignId: string; interaction: SourceInteraction; onClose: () => void }) {
  const [reference, setReference] = useState(interaction.reference);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    resolveSource(campaignId, interaction.reference).then((next) => { if (active) setReference(next); }).catch(() => { if (active) setUnavailable(true); });
    return () => { active = false; };
  }, [campaignId, interaction]);

  const update = (next: SourceReference) => {
    const range = findSourceReferenceRange(interaction.editor, interaction); if (!range) return;
    const payload = encodeSourceReference(next);
    const tr = interaction.editor.state.tr;
    if (range.atom) tr.setNodeMarkup(range.from, undefined, { payload });
    else {
      tr.removeMark(range.from, range.to, interaction.editor.schema.marks.sourceReference);
      tr.addMark(range.from, range.to, interaction.editor.schema.marks.sourceReference.create({ payload }));
    }
    interaction.editor.view.dispatch(tr); setReference(next);
  };

  const remove = () => {
    const range = findSourceReferenceRange(interaction.editor, interaction); if (!range) return;
    const tr = interaction.editor.state.tr;
    if (range.atom) tr.delete(range.from, range.to);
    else tr.removeMark(range.from, range.to, interaction.editor.schema.marks.sourceReference);
    interaction.editor.view.dispatch(tr); onClose();
  };

  return createPortal(<div className="fixed z-[260] w-72 rounded-lg border border-border bg-background p-3 shadow-xl" style={{ top: Math.min(interaction.rect.bottom + 6, window.innerHeight - 220), left: Math.min(interaction.rect.left, window.innerWidth - 300) }} role="dialog" aria-label="Source details">
    <div className="text-sm font-medium text-foreground">{reference.metadata.title}</div>
    <div className="mt-1 text-xs text-muted">{[reference.metadata.authors?.join(', '), reference.metadata.publisher, reference.metadata.year].filter(Boolean).join(' · ')}</div>
    {reference.locator ? <div className="mt-2 text-xs text-foreground">{reference.locator.label}</div> : null}
    {unavailable ? <div className="mt-2 text-xs text-muted">Provider unavailable · showing saved details</div> : null}
    <div className="mt-3 flex flex-wrap gap-2 text-xs">
      <button type="button" className="text-primary" onClick={async () => { const target = await fetchSourceOpenTarget(campaignId, reference).catch(() => null); if (target?.type === 'url') window.open(target.url, '_blank', 'noopener,noreferrer'); }}>Open source</button>
      {interaction.editor.isEditable ? <><button type="button" className="text-muted hover:text-foreground" onClick={() => { const label = window.prompt('Source locator', reference.locator?.label ?? ''); if (label !== null) update({ ...reference, ...(label.trim() ? { locator: { label: label.trim(), data: reference.locator?.data } } : { locator: undefined }) }); }}>Edit locator</button><button type="button" className="text-muted hover:text-destructive" onClick={remove}>Remove</button></> : null}
      <button type="button" className="ml-auto text-muted hover:text-foreground" onClick={onClose}>Close</button>
    </div>
  </div>, document.body);
}
