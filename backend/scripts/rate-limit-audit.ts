/**
 * Print effective rate-limit coverage for every statically mounted HTTP operation.
 * Usage (from backend/): npx tsx scripts/rate-limit-audit.ts
 */
import {
  collectRateLimitCoverage,
  findUncoveredOperations,
  formatRateLimitCoverageReport,
} from '../src/lib/rateLimit/coverage.js';

const entries = collectRateLimitCoverage();
console.log(formatRateLimitCoverageReport(entries));
console.log(`\n${entries.length} operations`);

const uncovered = findUncoveredOperations(entries);
if (uncovered.length > 0) {
  console.error('\nUNCOVERED (no effective rate-limit policy):');
  for (const u of uncovered) {
    console.error(`  ${u.method} ${u.path}`);
  }
  process.exit(1);
}
