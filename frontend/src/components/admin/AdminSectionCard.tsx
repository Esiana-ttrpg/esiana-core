import type { LucideIcon } from 'lucide-react';

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">
      {children}
    </span>
  );
}

export function ToggleRow({
  label,
  checked,
  onChange,
  description,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border border-border bg-background/60 px-4 py-3 ${
        disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded border-border bg-background text-primary focus:ring-primary/40 disabled:cursor-not-allowed"
      />
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-muted">{description}</span>
        )}
      </span>
    </label>
  );
}

export function AdminSectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary">
          <Icon className="size-5" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
