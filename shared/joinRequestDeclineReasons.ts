export type JoinRequestDeclineReason = {
  code: string;
  label: string;
  requiresMessage: boolean;
};

export const JOIN_REQUEST_DECLINE_REASONS: JoinRequestDeclineReason[] = [
  { code: 'schedule_mismatch', label: 'Schedule mismatch', requiresMessage: false },
  { code: 'table_full', label: 'Campaign already full', requiresMessage: false },
  { code: 'playstyle_fit', label: 'Looking for a different playstyle fit', requiresMessage: false },
  { code: 'experience_mismatch', label: 'Experience mismatch', requiresMessage: false },
  { code: 'tone_mismatch', label: 'Tone or content mismatch', requiresMessage: false },
  { code: 'other', label: 'Other', requiresMessage: true },
];

const CODE_SET = new Set(JOIN_REQUEST_DECLINE_REASONS.map((entry) => entry.code));

export function isValidDeclineReasonCode(code: string): boolean {
  return CODE_SET.has(code);
}

export function getDeclineReasonLabel(code: string): string {
  const match = JOIN_REQUEST_DECLINE_REASONS.find((entry) => entry.code === code);
  return match?.label ?? code;
}

export function declineReasonRequiresMessage(code: string): boolean {
  const match = JOIN_REQUEST_DECLINE_REASONS.find((entry) => entry.code === code);
  return match?.requiresMessage ?? false;
}
