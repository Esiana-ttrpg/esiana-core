/** Writing voice profiles for DM and players. */
export interface VoiceProfile {
  id: string;
  sentenceLength: [number, number];
  templates: string[];
}

export const VOICES = {
  dm: {
    id: 'dm',
    sentenceLength: [40, 120],
    templates: [
      'The {thing} holds deeper significance than the party yet understands.',
      'Rumors swirl around {thing}. Some say it is cursed.',
      'Historical records mention {thing} only in footnotes — suspicious.',
      '{thing} sits at the crossroads of three factions.',
    ],
  },
  playerTerse: {
    id: 'playerTerse',
    sentenceLength: [8, 35],
    templates: [
      'Fought near {thing}. Won, barely.',
      'Loot: nothing. Notes: {thing} is bad news.',
      'Need healing. {thing} next time.',
    ],
  },
  playerJournal: {
    id: 'playerJournal',
    sentenceLength: [60, 180],
    templates: [
      'I keep thinking about {thing}. Mother warned me about places like that.',
      'Dreamed of {thing} again. The ash smelled like home.',
      'Velis would laugh if they knew how {thing} made me feel.',
    ],
  },
  playerInventory: {
    id: 'playerInventory',
    sentenceLength: [15, 50],
    templates: [
      'Packed: rope, rations. Location: near {thing}.',
      'Sold the old map. New lead: {thing}.',
      'Stored gear at {thing} — hope it stays there.',
    ],
  },
} as const satisfies Record<string, VoiceProfile>;

export function renderVoice(voice: VoiceProfile, thing: string, rng: () => number): string {
  const tpl = voice.templates[Math.floor(rng() * voice.templates.length)];
  return tpl.replace(/\{thing\}/g, thing);
}
