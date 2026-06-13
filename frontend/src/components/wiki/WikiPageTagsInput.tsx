import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { labelFromTagName, slugifyTagName } from '@/lib/tagUtils';
import { tagChipStyle } from '@/lib/resolveTagIcon';
import { TagIcon } from '@/components/wiki/TagIcon';
import type { WikiTag, WikiTagInput } from '@/types/wiki';

const chipContainerClass =
  'flex min-h-[2.25rem] flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 focus-within:border-primary/60';

const chipClass =
  'inline-flex items-center gap-1 rounded-md border border-border bg-surface/80 px-2 py-0.5 text-xs text-foreground';

interface WikiPageTagsInputProps {
  assignedTags: WikiTagInput[];
  allCampaignTags: WikiTag[];
  onChange: (tags: WikiTagInput[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

function tagKey(tag: WikiTagInput): string {
  if (tag.id) return `id:${tag.id}`;
  if (tag.name) return `name:${tag.name}`;
  return `label:${tag.label ?? ''}`;
}

function tagsEqual(a: WikiTagInput[], b: WikiTagInput[]): boolean {
  if (a.length !== b.length) return false;
  const keysA = a.map(tagKey).sort().join('|');
  const keysB = b.map(tagKey).sort().join('|');
  return keysA === keysB;
}

export function wikiTagsInputsEqual(a: WikiTagInput[], b: WikiTagInput[]): boolean {
  return tagsEqual(a, b);
}

export function WikiPageTagsInput({
  assignedTags,
  allCampaignTags,
  onChange,
  disabled = false,
  compact = false,
}: WikiPageTagsInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const assignedKeys = useMemo(
    () => new Set(assignedTags.map(tagKey)),
    [assignedTags],
  );

  const filteredSuggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allCampaignTags.filter((tag) => {
      if (assignedKeys.has(`id:${tag.id}`)) return false;
      if (!needle) return true;
      return (
        tag.label.toLowerCase().includes(needle) ||
        tag.name.toLowerCase().includes(needle)
      );
    });
  }, [allCampaignTags, assignedKeys, query]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!containerRef.current || !target) return;
      if (!containerRef.current.contains(target)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  function removeTag(key: string) {
    onChange(assignedTags.filter((tag) => tagKey(tag) !== key));
  }

  function addTag(tag: WikiTagInput) {
    const key = tagKey(tag);
    if (assignedKeys.has(key)) return;
    onChange([...assignedTags, tag]);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleSelectExisting(tag: WikiTag) {
    addTag({ id: tag.id, name: tag.name, label: tag.label });
  }

  function handleCommitInput() {
    const trimmed = query.trim();
    if (!trimmed) return;

    const slug = slugifyTagName(trimmed);
    if (!slug) return;

    const exact = allCampaignTags.find(
      (tag) =>
        tag.name === slug ||
        tag.label.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exact) {
      handleSelectExisting(exact);
      return;
    }

    const nameKey = `name:${slug}`;
    if (assignedKeys.has(nameKey)) {
      setQuery('');
      return;
    }

    addTag({
      name: slug,
      label: trimmed || labelFromTagName(slug),
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={
          compact
            ? 'flex min-h-[1.625rem] flex-wrap items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 focus-within:border-primary/60'
            : chipContainerClass
        }
      >
        {assignedTags.map((tag) => {
          const key = tagKey(tag);
          const existing = allCampaignTags.find((t) => t.id === tag.id);
          const name = tag.name ?? existing?.name ?? slugifyTagName(tag.label ?? '');
          const label =
            tag.label ??
            existing?.label ??
            (tag.name ? labelFromTagName(tag.name) : 'Tag');
          const icon = existing?.icon ?? null;
          const iconAssetUrl = existing?.iconAssetUrl ?? null;
          const color = existing?.color ?? null;

          return (
            <span
              key={key}
              className={
                compact
                  ? 'inline-flex items-center gap-0.5 rounded border border-border bg-surface/80 px-1 py-px text-[10px] text-foreground'
                  : chipClass
              }
              style={tagChipStyle(color)}
            >
              <TagIcon
                name={name}
                icon={icon}
                iconAssetUrl={iconAssetUrl}
                className={compact ? 'size-2.5' : 'size-3'}
              />
              <span>{label}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeTag(key)}
                className="rounded p-0.5 text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
                aria-label={`Remove tag ${label}`}
              >
                <X className={compact ? 'size-2.5' : 'size-3'} aria-hidden />
              </button>
            </span>
          );
        })}

        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleCommitInput();
            }
            if (event.key === 'Backspace' && !query && assignedTags.length > 0) {
              const last = assignedTags[assignedTags.length - 1];
              removeTag(tagKey(last));
            }
          }}
          placeholder={assignedTags.length === 0 ? 'Add tags…' : ''}
          className={
            compact
              ? 'min-w-[3rem] flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted'
              : 'min-w-[6rem] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted'
          }
          aria-label="Add or search tags"
          autoComplete="off"
        />
      </div>

      {isOpen && filteredSuggestions.length > 0 && (
        <ul
          className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-background p-1 shadow-xl"
          role="listbox"
          aria-label="Tag suggestions"
        >
          {filteredSuggestions.map((tag) => (
            <li key={tag.id}>
              <button
                type="button"
                role="option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelectExisting(tag)}
                className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-surface"
              >
                <TagIcon
                  name={tag.name}
                  icon={tag.icon}
                  iconAssetUrl={tag.iconAssetUrl}
                  className="size-3.5"
                />
                <span>
                  {tag.label}
                  <span className="ml-1.5 text-xs text-muted">({tag.name})</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
