import {
  HelpCircle,
  Flag,
  Eye,
  Pin,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';
import type { ThreadKind } from '@/lib/threadMetadata';
import { THREAD_KINDS } from '@/lib/threadMetadata';
import { THREAD_KIND_CREATE_COPY } from '@/lib/threadCreate';
import {
  THREAD_KIND_LABELS,
  THREAD_KIND_TONE_CLASS,
} from '@/lib/threadVisualTokens';

const KIND_ICONS: Record<ThreadKind, LucideIcon> = {
  mystery: HelpCircle,
  promise: Flag,
  foreshadowing: Eye,
  clue: Pin,
  theory: MessageCircle,
};

interface ThreadKindPickerProps {
  value: ThreadKind;
  onChange: (kind: ThreadKind) => void;
  disabled?: boolean;
}

export function ThreadKindPicker({ value, onChange, disabled }: ThreadKindPickerProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {THREAD_KINDS.map((kind) => {
        const Icon = KIND_ICONS[kind];
        const copy = THREAD_KIND_CREATE_COPY[kind];
        const selected = value === kind;
        return (
          <button
            key={kind}
            type="button"
            disabled={disabled}
            onClick={() => onChange(kind)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              selected
                ? `${THREAD_KIND_TONE_CLASS[kind]} ring-1 ring-primary/50`
                : 'border-border bg-background/50 hover:border-primary/30'
            }`}
          >
            <div className="flex items-start gap-2">
              <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground">
                  {THREAD_KIND_LABELS[kind]}
                </span>
                <p className="mt-0.5 text-[11px] text-muted">{copy.description}</p>
                <p className="mt-1 text-[10px] italic text-muted/90">
                  e.g. {copy.example}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
