import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { AdvanceTimeResponse } from '@/lib/timeTrackingApi';
import { SessionTimeAdvancePanel } from '@/components/session/SessionTimeAdvancePanel';

export interface SessionTimeAdvanceModalProps {
  open: boolean;
  campaignHandle: string;
  sessionDuration: string | null | undefined;
  onSkip: () => void;
  onAdvanced: (response?: AdvanceTimeResponse) => void;
  onClose: () => void;
}

export function SessionTimeAdvanceModal({
  open,
  campaignHandle,
  sessionDuration,
  onSkip,
  onAdvanced,
  onClose,
}: SessionTimeAdvanceModalProps) {
  const [panelKey, setPanelKey] = useState(0);

  useEffect(() => {
    if (open) {
      setPanelKey((key) => key + 1);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-background p-4 shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className={TYPE_DISPLAY_CLASS}>How much time passed?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Advance the campaign clock to reflect in-world downtime between sessions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SessionTimeAdvancePanel
          key={panelKey}
          campaignHandle={campaignHandle}
          sessionDuration={sessionDuration}
          variant="immediate"
          showSkip
          onSkip={onSkip}
          onAdvanced={onAdvanced}
        />
      </div>
    </div>
  );
}
