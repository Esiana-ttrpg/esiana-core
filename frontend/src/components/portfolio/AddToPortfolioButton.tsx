import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addCampaignCharacterToPortfolio } from '@/lib/portfolio';

type Props = {
  pageId: string;
  characterName: string;
};

/** Explicit clone: campaign character → independent portfolio character. */
export function AddToPortfolioButton({ pageId, characterName }: Props) {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!campaignHandle || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await addCampaignCharacterToPortfolio(campaignHandle, pageId);
      navigate(`/characters/${result.portfolioCharacter.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to portfolio.');
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onClick()}
        className="rounded-md border border-border/60 px-2.5 py-1.5 text-xs text-muted hover:bg-elevated hover:text-foreground disabled:opacity-50"
        title={`Clone ${characterName} into your Character Portfolio`}
      >
        {busy ? 'Adding…' : 'Add to Portfolio'}
      </button>
      {error ? <p className="max-w-[14rem] text-right text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
