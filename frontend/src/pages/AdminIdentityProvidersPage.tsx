import { AdminIdentityProvidersSection } from '@/components/admin/AdminIdentityProvidersSection';
import { PageContainer } from '@/components/layout/PageContainer';

export function AdminIdentityProvidersPage() {
  return (
    <PageContainer>
      <header className="mb-8 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          External identity providers
        </h1>
        <p className="text-sm text-muted">
          Federated OIDC sign-in for self-hosted deployments. Upstream IdPs normalize groups and
          roles; Esiana consumes standard OIDC assertions.
        </p>
      </header>
      <AdminIdentityProvidersSection />
    </PageContainer>
  );
}
