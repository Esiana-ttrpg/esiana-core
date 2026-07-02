import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import type { InfoboxField } from '@/types/wiki';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

function ProfileInlineEditor({
  fields,
  onFieldsChange,
}: {
  fields: InfoboxField[];
  onFieldsChange: (fields: InfoboxField[]) => void;
}) {
  if (fields.length === 0) {
    return <p className="text-sm text-muted">No details yet.</p>;
  }
  return (
    <dl className="space-y-2">
      {fields.map((field, index) => (
        <div key={`${field.key}-${index}`} className="grid gap-1 sm:grid-cols-[6rem_1fr]">
          <dt className="text-xs font-medium text-muted">{field.key}</dt>
          <dd>
            <input
              type="text"
              value={field.value}
              onChange={(e) => {
                const next = [...fields];
                next[index] = { ...field, value: e.target.value };
                onFieldsChange(next);
              }}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary/50"
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export interface ProfileDetailsCardProps {
  title?: string;
  fields: InfoboxField[];
  isEditingPage: boolean;
  isDMUser?: boolean;
  onFieldsChange: (fields: InfoboxField[]) => void;
  className?: string;
}

export function ProfileDetailsCard({
  title = 'Details',
  fields,
  isEditingPage,
  isDMUser: isDMUserProp,
  onFieldsChange,
  className = '',
}: ProfileDetailsCardProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);

  return (
    <article className={`rounded-lg border border-border/60 bg-surface/40 p-4 ${className}`}>
      <h3 className={`${META_SECTION_LABEL_CLASS} mb-2`}>{title}</h3>
      {isEditingPage && isDMUser ? (
        <ProfileInlineEditor fields={fields} onFieldsChange={onFieldsChange} />
      ) : fields.length > 0 ? (
        <dl className="space-y-1.5 text-sm">
          {fields.slice(0, 8).map((field) => (
            <div key={field.key} className="flex justify-between gap-2">
              <dt className="text-muted">{field.key}</dt>
              <dd className="text-right font-medium">{field.value || '—'}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted">No details yet.</p>
      )}
    </article>
  );
}
