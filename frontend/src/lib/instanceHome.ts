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
