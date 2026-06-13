import type { MapPinPreviewDto } from '@/types/maps';
interface MapPinPreviewCardProps {
  preview: MapPinPreviewDto | null;
  loading: boolean;
  error?: string | null;
}

export function MapPinPreviewCard({
  preview,
  loading,
  error,
}: MapPinPreviewCardProps) {
  if (loading) {
    return (
      <div className="p-2 text-sm text-muted">Loading…</div>
    );
  }

  if (error) {
    return <div className="p-2 text-sm text-muted">{error}</div>;
  }

  if (!preview) return null;

  return (
    <div className="min-w-[200px] max-w-[260px] space-y-1 p-2">
      <div className="font-semibold leading-tight">{preview.title}</div>
      {preview.excerpt ? (
        <p className="text-sm text-muted leading-snug">{preview.excerpt}</p>
      ) : null}
      <div className="text-[11px] uppercase tracking-wide text-muted">
        {preview.visibility}
      </div>
    </div>
  );
}
