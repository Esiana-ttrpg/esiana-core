import { useEffect, useRef } from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import type { WizardStepDef, WizardStepId } from './types';

interface WizardStepNavProps {
  steps: WizardStepDef[];
  stepIndex: number;
  maxReachedIndex: number;
  isStepComplete: (stepId: WizardStepId) => boolean;
  onGoToStep: (index: number) => void;
}

export function WizardStepNav({
  steps,
  stepIndex,
  maxReachedIndex,
  isStepComplete,
  onGoToStep,
}: WizardStepNavProps) {
  const current = steps[stepIndex];
  const activeStepRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    activeStepRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [stepIndex]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted md:hidden">
        Step {stepIndex + 1} of {steps.length}
        {current ? (
          <>
            {' · '}
            <span className="text-foreground">
              {current.label}
              {current.optional ? ' (optional)' : ''}
            </span>
          </>
        ) : null}
      </p>
      <ol
        className={`flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:grid md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden ${
          steps.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-5'
        }`}
      >
        {steps.map((stepDef, index) => {
          const active = index === stepIndex;
          const done =
            index < stepIndex || (index <= maxReachedIndex && isStepComplete(stepDef.id));
          const reachable = index <= maxReachedIndex;
          return (
            <li
              key={stepDef.id}
              ref={active ? activeStepRef : undefined}
              className={`min-w-[7.5rem] shrink-0 rounded-lg border px-3 py-2 text-sm md:min-w-0 ${
                active
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : done
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                    : 'border-border text-muted'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (reachable) onGoToStep(index);
                }}
                disabled={!reachable}
                className="inline-flex w-full items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-70"
              >
                {done ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <ChevronRight className="size-4 shrink-0" />
                )}
                <span className="min-w-0">
                  <span className="block truncate">
                    {stepDef.label}
                    {stepDef.optional ? (
                      <span className="ml-1 text-xs font-normal text-muted">(optional)</span>
                    ) : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
