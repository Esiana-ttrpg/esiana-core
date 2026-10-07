/**
 * Built-in concept vocabulary for session-note aggregation.
 * Strong triggers match alone; contextual triggers only count when a strong
 * trigger for the same concept is also present in the paragraph.
 * Places consolidates Town/City/Wilderness — split later if playtesting prefers.
 */

export interface ConceptVocabularyEntry {
  id: string;
  label: string;
  strong: string[];
  contextual: string[];
}

export const SESSION_NOTE_CONCEPT_VOCABULARY: ConceptVocabularyEntry[] = [
  {
    id: 'concept:combat',
    label: 'Combat',
    strong: ['combat', 'fight', 'battle', 'fought', 'attacked', 'encounter'],
    contextual: [],
  },
  {
    id: 'concept:boss',
    label: 'Boss',
    strong: ['boss', 'boss fight', 'final fight', 'big bad'],
    contextual: [],
  },
  {
    id: 'concept:npcs',
    label: 'NPCs',
    strong: ['npc', 'npcs'],
    contextual: ['stranger', 'merchant', 'guard', 'innkeeper'],
  },
  {
    id: 'concept:social',
    label: 'Social',
    strong: [
      'talked',
      'spoke',
      'conversation',
      'questioned',
      'persuaded',
      'convinced',
      'negotiated',
    ],
    contextual: [],
  },
  {
    id: 'concept:travel',
    label: 'Travel',
    strong: ['travel', 'traveled', 'travelled', 'journey', 'arrived', 'departed'],
    contextual: ['road', 'route'],
  },
  {
    id: 'concept:places',
    label: 'Places',
    strong: ['town', 'village', 'city', 'wilderness', 'forest'],
    contextual: [
      'settlement',
      'district',
      'streets',
      'woods',
      'mountains',
      'swamp',
      'desert',
    ],
  },
  {
    id: 'concept:exploration',
    label: 'Exploration',
    strong: ['explored', 'searched', 'investigated', 'scouting', 'scout'],
    contextual: [],
  },
  {
    id: 'concept:discovery',
    label: 'Discovery',
    strong: ['discovered', 'learned', 'revealed', 'found out'],
    contextual: ['clue', 'evidence'],
  },
  {
    id: 'concept:loot',
    label: 'Loot',
    strong: ['loot', 'treasure', 'reward', 'rewards'],
    contextual: ['chest', 'gear', 'equipment'],
  },
  {
    id: 'concept:shopping',
    label: 'Shopping',
    strong: ['bought', 'purchased', 'sold', 'shopping'],
    contextual: ['shop', 'store', 'merchant'],
  },
  {
    id: 'concept:rest',
    label: 'Rest',
    strong: ['rest', 'rested', 'camp', 'camped', 'downtime'],
    contextual: [],
  },
  {
    id: 'concept:planning',
    label: 'Planning',
    strong: ['plan', 'planning', 'next session', 'next time'],
    contextual: ['going to'],
  },
  {
    id: 'concept:objective',
    label: 'Objective',
    strong: ['quest', 'mission', 'objective'],
    contextual: ['task', 'job'],
  },
  {
    id: 'concept:danger',
    label: 'Danger',
    strong: ['trap', 'hazard', 'ambush', 'danger'],
    contextual: [],
  },
  {
    id: 'concept:death-loss',
    label: 'Death / Loss',
    strong: ['died', 'death', 'killed', 'destroyed'],
    contextual: ['lost', 'missing'],
  },
];
