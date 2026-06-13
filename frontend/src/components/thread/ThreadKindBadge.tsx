import type { LucideIcon } from 'lucide-react';
import {
  Eye,
  Flag,
  HelpCircle,
  MessageCircle,
  Pin,
} from 'lucide-react';
import type { ThreadKind } from '@/lib/threadMetadata';
import {
  THREAD_KIND_ICONS,
  THREAD_KIND_LABELS,
  THREAD_KIND_TONE_CLASS,
} from '@/lib/threadVisualTokens';

const ICON_MAP: Record<string, LucideIcon> = {
  'help-circle': HelpCircle,
  flag: Flag,
  eye: Eye,
  pin: Pin,
  'message-circle': MessageCircle,
};

interface ThreadKindBadgeProps {
  kind: ThreadKind;
  className?: string;
}

export function ThreadKindBadge({ kind, className = '' }: ThreadKindBadgeProps) {
  const iconName = THREAD_KIND_ICONS[kind];
  const Icon = ICON_MAP[iconName] ?? HelpCircle;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${THREAD_KIND_TONE_CLASS[kind]} ${className}`}
    >
      <Icon className="size-3 shrink-0" strokeWidth={1.75} />
      {THREAD_KIND_LABELS[kind]}
    </span>
  );
}
