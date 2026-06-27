import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { RecruitmentLobbyResponse } from '@/types/recruitment';

const DOC_ORDER: Array<{
  key: keyof RecruitmentLobbyResponse['documentation'];
  title: string;
}> = [
  { key: 'tableExpectations', title: 'Table Expectations' },
  { key: 'sessionZero', title: 'Session Zero' },
  { key: 'rules', title: 'Rules & Expectations' },
  { key: 'characterCreation', title: 'Character Creation Guide' },
  { key: 'safetyGuidelines', title: 'Safety Guidelines' },
  { key: 'faq', title: 'FAQ' },
  { key: 'homebrew', title: 'Homebrew Content' },
];

function teaser(markdown: string, max = 120): string {
  const flat = markdown.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trim()}…`;
}

interface RecruitmentBeforeYouApplyProps {
  documentation: RecruitmentLobbyResponse['documentation'];
}

export function RecruitmentBeforeYouApply({ documentation }: RecruitmentBeforeYouApplyProps) {
  const items = DOC_ORDER.map(({ key, title }) => {
    const body = documentation[key];
    if (!body?.trim()) return null;
    return { key, title, body: body.trim() };
  }).filter(Boolean) as Array<{ key: string; title: string; body: string }>;

  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="space-y-4 border-b border-border/60 pb-8">
      <div>
        <h2 className={TYPE_DISPLAY_CLASS}>Before you apply</h2>
        <p className="mt-1 text-sm text-muted">
          Read these before you request a seat—they explain how this table runs.
        </p>
      </div>
      <ul className="divide-y divide-border/70 rounded-lg border border-border/80">
        {items.map((item) => {
          const isOpen = expandedKey === item.key;
          return (
            <li key={item.key}>
              <button
                type="button"
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-elevated/40"
                aria-expanded={isOpen}
                onClick={() => setExpandedKey(isOpen ? null : item.key)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{item.title}</span>
                  {!isOpen ? (
                    <span className="mt-1 block text-xs text-muted">{teaser(item.body)}</span>
                  ) : null}
                </span>
                <ChevronDown
                  className={`mt-0.5 size-4 shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
              {isOpen ? (
                <div className="border-t border-border/60 px-4 pb-4 pt-2">
                  <div className="prose prose-invert max-w-none text-sm text-foreground prose-p:my-2">
                    <ReactMarkdown>{item.body}</ReactMarkdown>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
