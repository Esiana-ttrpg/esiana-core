import { prisma } from '../src/lib/prisma.js';
import { initializeExistingChronologyWorkspaces } from '../src/lib/chronologyWikiWorkspace.js';

// Startup already runs this backfill. The CLI remains an operator retry hatch.
try {
  await initializeExistingChronologyWorkspaces();
  console.log('Chronology document ownership backfill complete.');
} finally {
  await prisma.$disconnect();
}
