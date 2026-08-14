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
  return (
    <ol
      className={`grid gap-2 ${
        steps.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-5'
      }`}
    >
      {steps.map((stepDef, index) => {
        const active = index === stepIndex;
        const done = index < stepIndex || (index <= maxReachedIndex && isStepComplete(stepDef.id));
        const reachable = index <= maxReachedIndex;
        return (
          <li
            key={stepDef.id}
            className={`rounded-lg border px-3 py-2 text-sm ${
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
  );
}
