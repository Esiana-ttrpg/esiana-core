import { useState } from 'react';
import { ImageCreditDisplay } from '@/components/media/ImageCreditDisplay';
import {
  AppearanceFormsWidget,
  AppearanceDetailsWidget,
} from '@/components/entity/appearance';
import type { AppearanceCapabilities } from '@/lib/entitySurfaceProfile';
import type {
  AppearanceDetailsViewModel,
  AppearanceFormsViewModel,
  EntityAppearanceViewModel,
} from '@/lib/entityAppearanceProjection';

interface EntityAppearanceReadViewProps {
  appearance: EntityAppearanceViewModel;
  forms?: AppearanceFormsViewModel;
  details?: AppearanceDetailsViewModel;
  appearanceCapabilities?: AppearanceCapabilities;
  /** Larger portrait presentation when forms capability is disabled. */
  prominentPortrait?: boolean;
  filterFormEntries?: (entry: import('@shared/appearanceMetadata').AppearanceGalleryEntry) => boolean;
}

type AppearanceReadTab = 'identity' | 'physical' | 'summary';

function SectionHeading({ children }: { children: string }) {
  return (
    <h3 className="text-sm font-medium text-muted">{children}</h3>
  );
}

function IdentityDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <span className="text-xs text-muted">{label}</span>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

export function EntityAppearanceReadView({
  appearance,
  forms,
  details,
  appearanceCapabilities = { forms: true, details: true, discoveryVariants: false },
  prominentPortrait = true,
  filterFormEntries,
}: EntityAppearanceReadViewProps) {
  const { portraitUrl, portraitCredit, summary, tags, pronouns, gender, presentation } =
    appearance;

  const showForms = appearanceCapabilities.forms && forms?.hasContent;
  const showDetails = appearanceCapabilities.details && details?.hasContent;
  const showLegacyPortrait = !showForms && Boolean(portraitUrl);

  const hasIdentityPresence = Boolean(gender || presentation || pronouns);
  const hasPhysical = Boolean(showLegacyPortrait || tags.length > 0);
  const hasSummary = Boolean(summary?.trim());

  const tabs: { id: AppearanceReadTab; label: string; visible: boolean }[] = [
    { id: 'identity', label: 'Identity', visible: hasIdentityPresence },
    { id: 'physical', label: 'Physical', visible: hasPhysical },
    { id: 'summary', label: 'Summary', visible: hasSummary },
  ];
  const visibleTabs = tabs.filter((tab) => tab.visible);
  const defaultTab = visibleTabs[0]?.id ?? 'summary';
  const [activeTab, setActiveTab] = useState<AppearanceReadTab>(defaultTab);

  const identitySection = hasIdentityPresence ? (
    <section className="space-y-3">
      <SectionHeading>Identity and presence</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-3">
        {gender ? <IdentityDetail label="Gender" value={gender} /> : null}
        {presentation ? <IdentityDetail label="Presentation" value={presentation} /> : null}
        {pronouns ? <IdentityDetail label="Pronouns" value={pronouns} /> : null}
      </div>
    </section>
  ) : null;

  const physicalSection = hasPhysical ? (
    <section className="space-y-3">
      <SectionHeading>Physical</SectionHeading>
      {showLegacyPortrait && portraitUrl ? (
        <div className="space-y-2">
          <img
            src={portraitUrl}
            alt=""
            className={
              prominentPortrait
                ? 'max-h-80 w-auto rounded-lg border border-border/40 object-cover shadow-sm'
                : 'max-h-48 w-auto rounded-lg border border-border/40 object-cover'
            }
          />
          <ImageCreditDisplay credit={portraitCredit} />
        </div>
      ) : null}

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border/40 bg-elevated/60 px-2.5 py-0.5 text-xs text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  ) : null;

  const summarySection = hasSummary ? (
    <section className="space-y-2">
      <SectionHeading>Summary</SectionHeading>
      <p className="wiki-reader-prose text-sm leading-relaxed text-foreground">{summary}</p>
    </section>
  ) : null;

  const shellContent =
    visibleTabs.length <= 1 ? (
      <div className="wiki-reader-prose space-y-6">
        {identitySection}
        {physicalSection}
        {summarySection}
      </div>
    ) : (
      <div className="wiki-reader-prose space-y-4">
        <div
          className="flex min-w-0 flex-wrap gap-1 border-b border-border/40 pb-2 sm:hidden"
          role="tablist"
          aria-label="Appearance sections"
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="sm:hidden">
          {activeTab === 'identity'
            ? identitySection
            : activeTab === 'physical'
              ? physicalSection
              : summarySection}
        </div>
        <div className="hidden space-y-6 sm:block">
          {identitySection}
          {physicalSection}
          {summarySection}
        </div>
      </div>
    );

  return (
    <div className="wiki-reader-prose space-y-6">
      {showForms && forms ? (
        <AppearanceFormsWidget
          mode="read"
          forms={forms}
          filterEntries={filterFormEntries}
        />
      ) : null}

      {showDetails && details ? (
        <AppearanceDetailsWidget mode="read" details={details} />
      ) : null}

      {shellContent}
    </div>
  );
}
