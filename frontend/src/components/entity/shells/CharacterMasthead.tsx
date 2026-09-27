import { Maximize2, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { CharacterIdentityProjection } from '@/lib/characterIdentityProjection';
import type { AppearancePresentationViewModel } from '@/lib/entityAppearanceProjection';
import { TYPE_DISPLAY_CLASS, TYPE_META_CLASS } from '@/lib/surfaceLayout';

interface CharacterMastheadProps {
  identity: CharacterIdentityProjection | null;
  presentation: AppearancePresentationViewModel;
  title: string | null;
  nameControl?: ReactNode;
  visibilityControl?: ReactNode;
}

export function CharacterMasthead({
  identity,
  presentation,
  title,
  nameControl,
  visibilityControl,
}: CharacterMastheadProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const portrait = presentation.portraitUrl?.trim() || null;
  const quickLine = [identity?.roleSubtitle, identity?.statusLabel].filter(Boolean).join(' · ');
  const context = [identity?.ancestryLabel, identity?.locationLabel, identity?.familyTitle]
    .filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index)
    .slice(0, 3);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (lightboxOpen && dialog && !dialog.open) dialog.showModal();
  }, [lightboxOpen]);

  return (
    <section className="mt-2 border-b border-border/30 pb-4" aria-label="Character masthead">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {portrait ? (
          <div className="relative w-fit shrink-0">
            <img src={portrait} alt="" className="h-40 w-32 rounded-md border border-border/35 object-cover shadow-sm sm:h-44 sm:w-36" />
            <button ref={expandRef} type="button" className="absolute bottom-2 right-2 rounded-md border border-border/50 bg-surface/90 p-1.5 text-foreground shadow-sm" onClick={() => setLightboxOpen(true)} aria-label="View full-size portrait">
              <Maximize2 className="size-4" aria-hidden />
            </button>
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1 pt-1">
          {nameControl ?? <h1 className={`${TYPE_DISPLAY_CLASS} text-2xl text-focal-foreground sm:text-3xl`}>{identity?.displayName}</h1>}
          {identity?.pronouns ? <p className={`${TYPE_META_CLASS} italic text-muted`}>{identity.pronouns}</p> : null}
          {title ? <p className="pt-2 text-base text-foreground">{title}</p> : null}
          {quickLine ? <p className={`${TYPE_META_CLASS} text-muted`}>{quickLine}</p> : null}
          {context.length ? <p className={`${TYPE_META_CLASS} pt-1 text-muted`}>{context.join(' · ')}</p> : null}
        </div>
        {visibilityControl ? <div className="shrink-0 self-start">{visibilityControl}</div> : null}
      </div>
      {lightboxOpen && portrait ? (
        <dialog ref={dialogRef} className="m-auto max-h-none max-w-none border-0 bg-transparent p-4 backdrop:bg-black/80" aria-label="Full-size portrait" onCancel={(event) => { event.preventDefault(); dialogRef.current?.close(); }} onClose={() => { setLightboxOpen(false); expandRef.current?.focus(); }}>
          <div className="fixed inset-0 flex items-center justify-center p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) dialogRef.current?.close(); }}>
            <img src={portrait} alt="" className="max-h-full max-w-full object-contain" />
            <button type="button" autoFocus className="absolute right-4 top-4 rounded-md bg-surface p-2 text-foreground" onClick={() => dialogRef.current?.close()} aria-label="Close full-size portrait"><X className="size-5" aria-hidden /></button>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}
