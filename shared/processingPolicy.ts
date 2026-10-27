export interface ProcessingPolicyInput {
  member: boolean; actorAllowed: boolean; globallyEnabled: boolean; connectionEnabled: boolean;
  modelEnabled: boolean; capabilitySupported: boolean; grantEnabled: boolean;
  featureEnabled: boolean; modelPermitted: boolean; quotaAvailable: boolean;
}
/** Infrastructure privileges are deliberately absent: they never authorize content. */
export function evaluateProcessingPolicy(input: ProcessingPolicyInput): { allowed: true } | { allowed: false; reason: string } {
  const gates: [keyof ProcessingPolicyInput, string][] = [
    ['member', 'campaign_membership_required'], ['actorAllowed', 'operation_forbidden'],
    ['globallyEnabled', 'processing_disabled'], ['connectionEnabled', 'connection_disabled'],
    ['modelEnabled', 'model_unavailable'], ['capabilitySupported', 'capability_unsupported'],
    ['grantEnabled', 'campaign_not_granted'], ['featureEnabled', 'feature_disabled'],
    ['modelPermitted', 'model_not_permitted'], ['quotaAvailable', 'usage_limit_exceeded'],
  ];
  for (const [key, reason] of gates) if (!input[key]) return { allowed: false, reason };
  return { allowed: true };
}
export function canReadRecording(input: {
  member: boolean; sessionVisible: boolean; staff: boolean; manager: boolean;
  uploader: boolean; visibility: string;
}): boolean {
  if (!input.member || !input.sessionVisible) return false;
  if (input.visibility === 'campaign') return true;
  if (input.visibility === 'staff') return input.staff;
  if (input.visibility === 'uploader_and_managers') return input.uploader || input.manager;
  return false;
}
