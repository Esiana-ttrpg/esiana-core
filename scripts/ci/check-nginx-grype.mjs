import { readFileSync } from 'node:fs';

const reportPath = process.argv[2];
if (!reportPath) throw new Error('Usage: node check-nginx-grype.mjs <grype-report.json>');

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
if (!Array.isArray(report.matches)) throw new Error('Grype report has no matches array');

const reportedIds = new Set([
  'CVE-2026-93479',
  'CVE-2026-15176',
  'CVE-2026-97205',
  'CVE-2026-97629',
  'CVE-2026-90439',
  'CVE-2026-95101',
]);

const nginxFindings = report.matches.filter((match) => match.artifact?.name === 'nginx');
const remaining = nginxFindings.filter((match) => reportedIds.has(match.vulnerability?.id));

console.log(`Grype found ${report.matches.length} total findings and ${nginxFindings.length} nginx findings`);
if (remaining.length > 0) {
  for (const match of remaining) {
    console.error(`${match.vulnerability.id}: nginx ${match.artifact.version}`);
  }
  throw new Error(`${remaining.length} nginx finding(s) from the October 21 report remain`);
}
console.log('All nginx findings from the October 21 report are absent');
