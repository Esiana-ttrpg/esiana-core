import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import type { DMSecretsData, WikiTreeNode } from '@/types/wiki';
import { WikiTipTapEditor } from './WikiTipTapEditor';

interface DMSecretsPanelProps {
  data: DMSecretsData | undefined;
  onChange: (data: DMSecretsData) => void;
  wikiTree: WikiTreeNode[];
}

export function DMSecretsPanel({
  data,
  onChange,
  wikiTree,
}: DMSecretsPanelProps) {
  const secrets = data ?? {};

  function handleWantsAndNeedsChange(value: string) {
    onChange({ ...secrets, wantsAndNeeds: value });
  }

  function handleSecretOrObstacleChange(value: string) {
    onChange({ ...secrets, secretOrObstacle: value });
  }

  function handleQuestRelationChange(value: string) {
    onChange({ ...secrets, questRelation: value });
  }

  return (
    <div className="space-y-4">
      <section>
        <h3 className={`mb-2 ${META_SECTION_LABEL_CLASS}`}>
          Wants and Needs
        </h3>
        <WikiTipTapEditor
          content={secrets.wantsAndNeeds ?? ''}
          onChange={handleWantsAndNeedsChange}
          wikiTree={wikiTree}
          placeholder="What this character wants and needs…"
          minHeight="min-h-[120px]"
        />
      </section>

      <section>
        <h3 className={`mb-2 ${META_SECTION_LABEL_CLASS}`}>
          Secret or Obstacle
        </h3>
        <WikiTipTapEditor
          content={secrets.secretOrObstacle ?? ''}
          onChange={handleSecretOrObstacleChange}
          wikiTree={wikiTree}
          placeholder="Secrets or obstacles related to this character…"
          minHeight="min-h-[120px]"
        />
      </section>

      <section>
        <label className="block space-y-1">
          <span className={META_SECTION_LABEL_CLASS}>
            Quest Relation
          </span>
          <input
            value={secrets.questRelation ?? ''}
            onChange={(e) => handleQuestRelationChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60"
            placeholder="Link to a quest page (page title or ID)"
          />
          {secrets.questRelation && (
            <p className="text-xs text-muted">
              Linked to: {secrets.questRelation}
            </p>
          )}
        </label>
      </section>
    </div>
  );
}
