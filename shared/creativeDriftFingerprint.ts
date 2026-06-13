/**
 * Server-side drift fingerprinting (Node crypto — not for browser bundles).
 */
import { createHash } from 'node:crypto';
import type { DriftSubjectKind } from './creativeDrift.js';

export function driftFingerprint(
  bucket: string,
  subjectKind: DriftSubjectKind,
  subjectId: string,
  suffix?: string,
): string {
  const raw = [bucket, subjectKind, subjectId, suffix ?? ''].filter(Boolean).join('|');
  return createHash('sha256').update(raw).digest('hex').slice(0, 24);
}
