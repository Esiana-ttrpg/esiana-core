import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  IMAGE_CREDIT_DISCLAIMER,
  MADE_WITH_SUGGESTIONS,
  normalizeImageCredit,
  type ImageCredit,
} from '@shared/imageCredit';

interface ImageCreditEditorProps {
  value: ImageCredit | null | undefined;
  onChange: (next: ImageCredit | null) => void;
  /** Called when the section is collapsed, if the credit changed. */
  onPersist?: (next: ImageCredit | null) => void;
  disabled?: boolean;
  inputClassName?: string;
}

const defaultInputClass =
  'mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-70';

export function ImageCreditEditor({
  value,
  onChange,
  onPersist,
  disabled = false,
  inputClassName = defaultInputClass,
}: ImageCreditEditorProps) {
  const [open, setOpen] = useState(false);
  const credit = value ?? {};

  const update = (patch: Partial<ImageCredit>) => {
    const merged = { ...credit, ...patch };
    onChange(normalizeImageCredit(merged));
  };

  const toggleOpen = () => {
    setOpen((prev) => {
      if (prev && onPersist) {
        onPersist(normalizeImageCredit(credit));
      }
      return !prev;
    });
  };

  return (
    <div className="mt-3 w-full border-t border-border/60 pt-3">
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className="flex w-full items-center gap-1.5 text-left text-sm font-medium text-foreground disabled:opacity-70"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
        )}
        Image credit (optional)
      </button>

      {open ? (
        <div className="mt-2 space-y-3">
          <p className="text-xs text-muted">
            Optional — thank artists and tools when you can.
          </p>
          <p className="text-xs text-muted">{IMAGE_CREDIT_DISCLAIMER}</p>

          <label className="block text-sm text-foreground">
            Art credit
            <input
              type="text"
              disabled={disabled}
              value={credit.artCredit ?? ''}
              onChange={(e) => update({ artCredit: e.target.value || null })}
              placeholder="Artist name"
              className={inputClassName}
            />
            <input
              type="url"
              disabled={disabled}
              value={credit.artCreditUrl ?? ''}
              onChange={(e) => update({ artCreditUrl: e.target.value || null })}
              placeholder="Portfolio or social URL (optional)"
              className={`${inputClassName} mt-1.5`}
            />
          </label>

          <label className="block text-sm text-foreground">
            Source
            <input
              type="text"
              disabled={disabled}
              value={credit.source ?? ''}
              onChange={(e) => update({ source: e.target.value || null })}
              placeholder="ArtStation, Fandom, etc."
              className={inputClassName}
            />
            <input
              type="url"
              disabled={disabled}
              value={credit.sourceUrl ?? ''}
              onChange={(e) => update({ sourceUrl: e.target.value || null })}
              placeholder="Link to image or gallery (optional)"
              className={`${inputClassName} mt-1.5`}
            />
          </label>

          <label className="block text-sm text-foreground">
            Made with
            <input
              type="text"
              disabled={disabled}
              value={credit.madeWith ?? ''}
              onChange={(e) => update({ madeWith: e.target.value || null })}
              placeholder="HeroForge, Inkarnate, etc."
              className={inputClassName}
              list="image-credit-made-with-suggestions"
            />
            <datalist id="image-credit-made-with-suggestions">
              {MADE_WITH_SUGGESTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <input
              type="url"
              disabled={disabled}
              value={credit.madeWithUrl ?? ''}
              onChange={(e) => update({ madeWithUrl: e.target.value || null })}
              placeholder="Tool URL (optional)"
              className={`${inputClassName} mt-1.5`}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
