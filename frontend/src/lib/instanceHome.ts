export type InstanceHomeSurface = 'loading' | 'hub' | 'landing';

export function resolveInstanceHomeSurface(input: {
  authLoading: boolean;
  brandingReady: boolean;
  isAuthenticated: boolean;
  instanceRequiresLogin: boolean;
}): InstanceHomeSurface {
  if (input.authLoading || !input.brandingReady) return 'loading';
  if (input.isAuthenticated) return 'hub';
  if (input.instanceRequiresLogin) return 'landing';
  return 'hub';
}

export function currentAuthReturnTo(): string {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}` || '/';
}

export function canCreateAccount(input: {
  allowRegistrations: boolean;
  userTableEmpty?: boolean;
}): boolean {
  return input.allowRegistrations === true || input.userTableEmpty === true;
}

export function canOfferRegistrationAction(input: {
  canCreateAccount: boolean;
  localLoginEnabled: boolean;
  hasOidcProviders: boolean;
}): boolean {
  if (!input.canCreateAccount) return false;
  return input.localLoginEnabled || input.hasOidcProviders;
}
