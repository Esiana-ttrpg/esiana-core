import { pickInt } from './rng.js';

const LOCATION_PREFIXES = [
  'Ashford',
  'Blackwater',
  'Mirewatch',
  'Velis',
  'Pale',
  'Silver',
  'Iron',
  'Storm',
  'Ember',
  'Frost',
];
const LOCATION_SUFFIXES = ['Keep', 'Crossing', 'Hollow', 'Reach', 'Watch', 'Harbor', 'Gate', 'March'];
const FACTION_PREFIXES = ['Silver', 'Ashbound', 'Pale', 'Free', 'Iron', 'Crimson', 'Obsidian'];
const FACTION_SUFFIXES = ['Accord', 'Covenant', 'Court', 'Companies', 'League', 'Compact', 'Circle'];
const NPC_GIVEN = ['Velis', 'Hale', 'Morr', 'Tatch', 'Sera', 'Dorn', 'Kira', 'Rook', 'Lyra', 'Cade'];
const NPC_FAMILY = ['Ashford', 'Velis', 'Hale', 'Morr', 'Brightquill', 'Stone', 'Reed', 'Moon'];
const QUEST_VERBS = ['Missing', 'Silent', 'Broken', 'Hidden', 'Fallen', 'Lost', 'Burning'];
const QUEST_NOUNS = ['Convoy', 'Crown', 'Bell', 'Seal', 'Road', 'Relic', 'Oath'];

export function proceduralLocationName(rng: () => number, index: number): string {
  const prefix = LOCATION_PREFIXES[index % LOCATION_PREFIXES.length] ?? 'North';
  const suffix = pickInt(rng, 0, LOCATION_SUFFIXES.length - 1);
  const base = LOCATION_SUFFIXES[suffix] ?? 'Hold';
  return `${prefix} ${base} ${index + 1}`;
}

export function proceduralFactionName(rng: () => number, index: number): string {
  const prefix = FACTION_PREFIXES[index % FACTION_PREFIXES.length] ?? 'Free';
  const suffix = pickInt(rng, 0, FACTION_SUFFIXES.length - 1);
  const base = FACTION_SUFFIXES[suffix] ?? 'League';
  return `${prefix} ${base}`;
}

export function proceduralNpcName(rng: () => number, index: number): string {
  const given = NPC_GIVEN[index % NPC_GIVEN.length] ?? 'Scout';
  const family = NPC_FAMILY[pickInt(rng, 0, NPC_FAMILY.length - 1)] ?? 'Walker';
  return index % 3 === 0 ? `${given} ${family}` : given;
}

export function proceduralQuestTitle(rng: () => number, index: number): string {
  const verb = QUEST_VERBS[index % QUEST_VERBS.length] ?? 'Lost';
  const noun = QUEST_NOUNS[pickInt(rng, 0, QUEST_NOUNS.length - 1)] ?? 'Trail';
  return `The ${verb} ${noun}`;
}

export function slugifyTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
