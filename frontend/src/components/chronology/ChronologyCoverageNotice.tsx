import type { ChronologyTimelineBundle, ExpansionWarningCode } from '@/lib/chronologyApi';
import { historicalCoverage } from '@/lib/historicalTimeline';

const warningLabels: Record<ExpansionWarningCode, string> = {
  CAP_APPLIED_PER_EVENT: 'Some events reached their occurrence limit.',
  CAP_APPLIED_TOTAL: 'The total occurrence limit was reached.',
  UNBOUNDED_RULE_FORCED_CAP: 'Unbounded recurrence rules were limited.',
  CLIPPED_DAY_TO_MONTH_END: 'Some dates were clipped to the end of their native month.',
  MOON_OVERRIDE_TARGET_NOT_FOUND: 'A moon override target was unavailable.',
  INVALID_CONDITION_NODE_SKIPPED: 'An unsupported event condition was skipped.',
  PREREQUISITE_REFERENCE_MISSING: 'An event prerequisite was unavailable.',
  WINDOW_PARSE_FALLBACK_APPLIED: 'The requested historical window could not be applied.',
};

export function ChronologyCoverageNotice({ metadata, className = '' }: {
  metadata: ChronologyTimelineBundle['expansionMetadata']; className?: string;
}) {
  const coverage = historicalCoverage(metadata);
  if (!coverage.message && !coverage.warnings.length) return null;
  return <div className={'text-xs text-muted ' + className}>
    {coverage.message && <p role="status">{coverage.message}{metadata.generated.truncated && <span> Some event occurrences are omitted because expansion limits were reached.</span>}</p>}
    {coverage.warnings.length > 0 && <details><summary className="min-h-11 cursor-pointer py-3">Occurrence coverage details</summary>
      <ul className="list-disc space-y-1 pl-4">{coverage.warnings.map(code => <li key={code}>{warningLabels[code]}</li>)}</ul>
    </details>}
  </div>;
}
