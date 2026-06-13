/**
 * Reference World Development plugin — setting-specific event templates.
 */
const PLUGIN_ID = 'settlement-life';

const BROTHEL_FIRE_DEF = {
  id: `${PLUGIN_ID}:brothel_fire`,
  developmentType: 'faction_pressure',
  label: 'Local Brothel Fire',
  significance: 'minor',
  applicableMomentumStates: ['rising', 'expanding'],
  defaultLifecycle: {
    prepMinutes: 0,
    cooldownMinutes: 14 * 24 * 60,
    significance: 'minor',
  },
  acceptTarget: 'calendar_event',
  tags: ['social'],
  source: { kind: 'plugin', pluginId: PLUGIN_ID },
};

export function register(_router, context) {
  context.registerDevelopmentProvider({
    id: PLUGIN_ID,
    developmentDefinitions: () => [BROTHEL_FIRE_DEF],
    generateCandidates(ctx) {
      return ctx.projectedFactionStates
        .filter((faction) => faction.momentum === 'rising' || faction.momentum === 'expanding')
        .map((faction) => ({
          definitionId: BROTHEL_FIRE_DEF.id,
          developmentType: 'faction_pressure',
          title: `${faction.orgTitle} — Local Brothel Fire`,
          narrative: `A fire breaks out in ${faction.orgTitle}'s entertainment district as growth outpaces safety.`,
          rationale: [
            {
              kind: 'trajectory',
              text: `${faction.orgTitle} — ${faction.momentumLabel}`,
            },
            {
              kind: 'pressure',
              text: 'Rapid growth increases risk in the entertainment district.',
            },
          ],
          idempotencyKey: `world-dev:${ctx.nextEpochMinute}:${BROTHEL_FIRE_DEF.id}:${faction.orgPageId}`,
          primaryOrgPageId: faction.orgPageId,
          eraId: faction.eraId,
          momentumState: faction.momentum,
          trendDirection: null,
          proposedAcceptTarget: 'calendar_event',
          suggestionKind: 'faction_pressure',
        }));
    },
  });

  context.registerEligibilityProvider({
    definitionId: BROTHEL_FIRE_DEF.id,
    async isEligible({ campaignId, faction }) {
      if (!faction) return false;
      let data;
      try {
        data = context.createPluginDataService(campaignId);
      } catch {
        return true;
      }
      const settlements = await data.get('settlementsWithBrothel');
      if (!Array.isArray(settlements) || settlements.length === 0) {
        return true;
      }
      return settlements.includes(faction.orgPageId);
    },
  });

  context.registerRationaleProvider({
    definitionId: BROTHEL_FIRE_DEF.id,
    appendRationale({ faction }) {
      if (!faction) return [];
      return [
        {
          kind: 'canon_signal',
          text: 'Entertainment district present in settlement records.',
        },
      ];
    },
  });
}

export default register;
