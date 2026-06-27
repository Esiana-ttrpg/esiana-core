import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  APPEARANCE_SUMMARY_PLACEHOLDER,
  APPEARANCE_WRITING_PROMPT_LEAD,
  APPEARANCE_WRITING_PROMPTS,
  pickAppearanceMicroPrompt,
} from '@/lib/appearanceSummaryPrompts';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface AppearanceSummaryFieldProps {
  value: string | null;
  onChange: (summary: string | null) => void;
  onPersist: (summary: string | null) => void;
  id?: string;
}

function WritingPromptsList() {
  return (
    <div className="mt-2 rounded-md border border-border/50 bg-surface/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted">
      <p className="font-medium text-foreground/90">{APPEARANCE_WRITING_PROMPT_LEAD}</p>
      <ul className="mt-2 list-inside list-disc space-y-1">
        {APPEARANCE_WRITING_PROMPTS.map((prompt) => (
          <li key={prompt}>{prompt}</li>
        ))}
      </ul>
    </div>
  );
}

export function AppearanceSummaryField({
  value,
  onChange,
  onPersist,
  id = 'appearance.summary',
}: AppearanceSummaryFieldProps) {
  const [promptsOpen, setPromptsOpen] = useState(true);
  const [microPrompt] = useState(pickAppearanceMicroPrompt);

  const text = value ?? '';
  const isEmpty = !text.trim();

  return (
    <div className="space-y-1" id={id}>
      <span className={META_FIELD_LABEL_CLASS}>
        Appearance summary
      </span>
      <textarea
        className={`${fieldClass} min-h-[5rem] resize-y`}
        placeholder={APPEARANCE_SUMMARY_PLACEHOLDER}
        value={text}
        onChange={(e) => onChange(e.target.value || null)}
        onBlur={() => onPersist(value)}
        aria-describedby={`${id}-helper`}
      />

      <div id={`${id}-helper`} className="space-y-1 pt-0.5">
        {isEmpty ? (
          <p className="text-[11px] italic text-muted/90">{microPrompt}</p>
        ) : null}

        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setPromptsOpen((open) => !open)}
          className="flex items-center gap-1 text-[11px] font-medium text-muted hover:text-foreground"
          aria-expanded={promptsOpen}
        >
          {promptsOpen ? (
            <ChevronDown className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="size-3.5 shrink-0" aria-hidden />
          )}
          {promptsOpen ? 'Writing prompts' : 'Need inspiration?'}
        </button>

        {promptsOpen ? <WritingPromptsList /> : null}
      </div>
    </div>
  );
}
