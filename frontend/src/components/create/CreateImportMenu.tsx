const IMPORT_TOOLTIP = 'Import tools are planned for a future release.';

export function CreateImportMenu() {
  return (
    <button
      type="button"
      disabled
      title={IMPORT_TOOLTIP}
      aria-label={IMPORT_TOOLTIP}
      className="cursor-not-allowed rounded-lg border border-border bg-elevated px-3 py-1.5 text-sm text-muted opacity-60"
    >
      Import
    </button>
  );
}
