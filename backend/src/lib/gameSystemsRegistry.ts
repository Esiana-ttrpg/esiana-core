export type GameSystemEntry = {
  slug: string;
  label: string;
  category: string;
  description: string;
  resourceUrl: string;
};

export const GAME_SYSTEM_CATEGORIES = [
  'Tactical & High-Fantasy',
  'Sci-Fi, Mechs & Cyberpunk',
  'Horror & Urban Fantasy',
  'LitRPG & Adapted Worlds',
  'Narrative, PbtA & Queer Indie',
  'Genre-Agnostic Sandbox Tools',
  'Other',
] as const;

export const GAME_SYSTEMS: GameSystemEntry[] = [
  // Tactical & High-Fantasy
  {
    slug: '13th-age',
    label: '13th Age',
    category: 'Tactical & High-Fantasy',
    description:
      'A dynamic, d20-powered fantasy system designed by former D&D lead developers that blends tactical grid combat with narrative rules like "One Unique Thing" and background-based skills.',
    resourceUrl: 'https://pelgranepress.com/13th-age/',
  },
  {
    slug: 'dnd-5e',
    label: 'Dungeons & Dragons (5th Edition)',
    category: 'Tactical & High-Fantasy',
    description:
      'The world\'s most recognized and widely played TTRPG, utilizing a d20-based system centered on heroic high-fantasy, class progression, and tactical combat.',
    resourceUrl: 'https://www.dndbeyond.com/',
  },
  {
    slug: 'daggerheart',
    label: 'Daggerheart',
    category: 'Tactical & High-Fantasy',
    description:
      'A fantasy RPG designed for streaming-style play, blending narrative collaboration with tactical combat and hope/fear mechanics.',
    resourceUrl: 'https://www.daggerheart.com/',
  },
  {
    slug: 'dragonbane',
    label: 'Dragonbane',
    category: 'Tactical & High-Fantasy',
    description:
      'A fast, brutally fun, and highly accessible Scandinavian fantasy RPG built on a d20 roll-under mechanic that favors quick play, dangerous encounters, and open-ended exploration.',
    resourceUrl: 'https://freeleaguepublishing.com/games/dragonbane/',
  },
  {
    slug: 'fabula-ultima',
    label: 'Fabula Ultima',
    category: 'Tactical & High-Fantasy',
    description:
      'A "tabletop JRPG" designed to emulate the feel of console roleplaying games with class combos, limit breaks, and collaborative storytelling.',
    resourceUrl: 'https://www.needgames.it/fabula-ultima/',
  },
  {
    slug: 'pathfinder-1e',
    label: 'Pathfinder (1e)',
    category: 'Tactical & High-Fantasy',
    description:
      'Built on the foundations of 3.5e D&D, this legacy system is celebrated for offering massive mechanical depth, unparalleled character-building options, and precise tactical depth.',
    resourceUrl: 'https://paizo.com/pathfinder',
  },
  {
    slug: 'pathfinder-2e',
    label: 'Pathfinder (2e)',
    category: 'Tactical & High-Fantasy',
    description:
      'A highly streamlined, modernized version of the tactical ruleset featuring a robust 3-action economy system, deep but balanced modular character customization, and incredibly tight combat design.',
    resourceUrl: 'https://2e.aonprd.com/',
  },
  {
    slug: 'pendragon',
    label: 'Pendragon',
    category: 'Tactical & High-Fantasy',
    description:
      'A legendary game centered on Arthurian legend and long-form character growth across generations of knights and their families.',
    resourceUrl: 'https://www.chaosium.com/pendragon/',
  },
  {
    slug: 'shadowdark-rpg',
    label: 'Shadowdark RPG',
    category: 'Tactical & High-Fantasy',
    description:
      'An acclaimed Old School Renaissance (OSR) engine with modern intuitive sensibilities, featuring real-time light tracking, roll-to-cast magic, and lethal dungeon-crawling focus.',
    resourceUrl: 'https://www.thearcanelibrary.com/pages/shadowdark',
  },
  {
    slug: 'twilight-sword',
    label: 'Twilight Sword',
    category: 'Tactical & High-Fantasy',
    description:
      'A dark, moody tactical fantasy system that weaves themes of fading magical eras, historical melancholy, and high-lethality sword combat.',
    resourceUrl: 'https://itch.io/physical-games/tag-ttrpg',
  },
  {
    slug: 'warhammer-fantasy-roleplay',
    label: 'Warhammer Fantasy Roleplay',
    category: 'Tactical & High-Fantasy',
    description:
      'A dark, grim-dark d100 career-based fantasy system where players take on mundane professions trying to survive an unforgiving, chaotic world.',
    resourceUrl: 'https://cubicle7games.com/our-games/warhammer-fantasy-roleplay-2',
  },

  // Sci-Fi, Mechs & Cyberpunk
  {
    slug: 'alien-rpg',
    label: 'Alien: The Roleplaying Game',
    category: 'Sci-Fi, Mechs & Cyberpunk',
    description:
      'A cinematic sci-fi horror game leveraging a specialized Year Zero Engine d6 pool. Players balance stress mechanics that enhance performance right up until a character panics.',
    resourceUrl: 'https://alien-rpg.com/',
  },
  {
    slug: 'cyberpunk-red',
    label: 'Cyberpunk Red',
    category: 'Sci-Fi, Mechs & Cyberpunk',
    description:
      'The official prequel timeline to the Cyberpunk 2077 video game. It delivers deadly Interlock-system street-level combat, netrunning, and corporate dystopia.',
    resourceUrl: 'https://rtalsoriangames.com/cyberpunk-red/',
  },
  {
    slug: 'lancer',
    label: 'Lancer',
    category: 'Sci-Fi, Mechs & Cyberpunk',
    description:
      'An exceptional blend of deep tactical, grid-based mech combat and narrative, rules-light downtime operations set in a vibrant, mud-and-lasers sci-fi universe.',
    resourceUrl: 'https://massifpress.com/',
  },
  {
    slug: 'neon-odyssey-space-opera',
    label: 'Neon Odyssey: Space Opera',
    category: 'Sci-Fi, Mechs & Cyberpunk',
    description:
      'A high-action, dramatic sci-fi roleplaying engine engineered for fast ship-to-ship skirmishes, galactic exploration, and epic space opera campaign arcs.',
    resourceUrl: 'https://itch.io/physical-games/tag-ttrpg',
  },
  {
    slug: 'shadowrun',
    label: 'Shadowrun',
    category: 'Sci-Fi, Mechs & Cyberpunk',
    description:
      'A unique blend of high-fantasy (magic/elves) and cyberpunk (hackers/tech) in a dystopian near-future setting.',
    resourceUrl: 'https://www.shadowruntabletop.com/',
  },
  {
    slug: 'starfinder-1e',
    label: 'Starfinder (1e)',
    category: 'Sci-Fi, Mechs & Cyberpunk',
    description:
      'A science-fantasy ruleset derived from Pathfinder 1e that meshes high-tech spaceships, cyberware, and futuristic weaponry with classic magical fantasy elements.',
    resourceUrl: 'https://paizo.com/starfinder',
  },
  {
    slug: 'starfinder-2e',
    label: 'Starfinder (2e)',
    category: 'Sci-Fi, Mechs & Cyberpunk',
    description:
      'A complete modernization of the science-fantasy ruleset, completely rebuilt to seamlessly cross-play with the updated tactical framework of the Pathfinder 2e d20 engine.',
    resourceUrl: 'https://paizo.com/starfinder',
  },
  {
    slug: 'star-trek-adventures',
    label: 'Star Trek Adventures',
    category: 'Sci-Fi, Mechs & Cyberpunk',
    description:
      'Powered by the 2d20 system, this narrative-forward game models Starfleet operations, teamwork, ethical dilemmas, and ship management down to the individual department.',
    resourceUrl: 'https://www.modiphius.net/pages/star-trek-adventures',
  },
  {
    slug: 'traveller',
    label: 'Traveller',
    category: 'Sci-Fi, Mechs & Cyberpunk',
    description:
      'A historic, gold-standard d6 hard-sci-fi sandbox system famous for its deep starship design, trade mechanics, and highly immersive, potentially lethal character life-path generation.',
    resourceUrl: 'https://www.mongoosepublishing.com/',
  },

  // Horror & Urban Fantasy
  {
    slug: 'call-of-cthulhu',
    label: 'Call of Cthulhu',
    category: 'Horror & Urban Fantasy',
    description:
      'A d100 investigative system centered on cosmic horror, mystery solving, and a delicate sanity tracking system where exposing your mind to the mythos risks permanent madness.',
    resourceUrl: 'https://www.chaosium.com/call-of-cthulhu-rpg/',
  },
  {
    slug: 'city-of-mist',
    label: 'City of Mist',
    category: 'Horror & Urban Fantasy',
    description:
      'A gorgeous, cinematic detective noir game where regular citizens channel the mythical powers of legends, gods, and fairy tales using tag-based narrative mechanics.',
    resourceUrl: 'https://cityofmist.co/',
  },
  {
    slug: 'delta-green',
    label: 'Delta Green',
    category: 'Horror & Urban Fantasy',
    description:
      'An award-winning, spin-off evolution of the Cthulhu Mythos mutated into a modern-day conspiracy thriller about secret government black-ops agents keeping the unexplainable quiet.',
    resourceUrl: 'https://www.deltagreen.org/',
  },
  {
    slug: 'vampire-the-masquerade',
    label: 'Vampire: The Masquerade',
    category: 'Horror & Urban Fantasy',
    description:
      'The flagship title of the Storyteller system, placing players in the shoes of secret undead factions struggling with politics, personal horror, and keeping the "Beast" at bay.',
    resourceUrl: 'https://www.worldofdarkness.com/',
  },

  // LitRPG & Adapted Worlds
  {
    slug: 'avatar-legends',
    label: 'Avatar Legends',
    category: 'LitRPG & Adapted Worlds',
    description:
      'The official Powered by the Apocalypse tabletop game allowing players to tell heartfelt stories of balance, martial arts, and elemental bending across the eras of the Avatar universe.',
    resourceUrl: 'https://magpiegames.com/pages/avatargetting',
  },
  {
    slug: 'cosmere-rpg-mistborn',
    label: 'Cosmere RPG (Mistborn)',
    category: 'LitRPG & Adapted Worlds',
    description:
      'Built on an original d20-based hybrid narrative system by Brotherwise Games, this campaign setting allows players to burn metals via Allomancy and explore Scadrial across both major eras.',
    resourceUrl: 'https://www.brotherwisegames.com/',
  },
  {
    slug: 'discworld-ankh-morpork',
    label: 'Discworld: Adventures in Ankh-Morpork',
    category: 'LitRPG & Adapted Worlds',
    description:
      'Powered by the bespoke, rules-light "Narrativium System," this Modiphius game captures the exact wit and humanistic satire of Sir Terry Pratchett\'s legendary city.',
    resourceUrl: 'https://modiphius.net/pages/discworld-adventures',
  },
  {
    slug: 'fallout-rpg',
    label: 'Fallout RPG',
    category: 'LitRPG & Adapted Worlds',
    description:
      'The official adaptation of the post-apocalyptic video game series utilizing the 2d20 system, complete with scavenging tables, VATS tactical combat, and retro-futuristic survival mechanics.',
    resourceUrl: 'https://www.modiphius.net/pages/fallout-the-roleplaying-game',
  },
  {
    slug: 'the-one-ring',
    label: 'The One Ring',
    category: 'LitRPG & Adapted Worlds',
    description:
      'An elegant, highly immersive system designed specifically to capture the tone, travel fatigue, fellowship bonds, and creeping shadow found in J.R.R. Tolkien\'s Middle-earth.',
    resourceUrl: 'https://freeleaguepublishing.com/games/the-one-ring/',
  },

  // Narrative, PbtA & Queer Indie
  {
    slug: 'apocalypse-world-burned-over',
    label: 'Apocalypse World: Burned Over',
    category: 'Narrative, PbtA & Queer Indie',
    description:
      'A streamlined, re-designed, non-explicit edition of the legendary post-apocalyptic game that established the "Powered by the Apocalypse" framework.',
    resourceUrl: 'http://lumpley.com/',
  },
  {
    slug: 'blades-in-the-dark',
    label: 'Blades in the Dark',
    category: 'Narrative, PbtA & Queer Indie',
    description:
      'A landmark heist engine tracking a crew of daring scoundrels building a criminal enterprise in a haunted, industrial-fantasy city fueled by lightning barriers and ghost blood.',
    resourceUrl: 'https://evilhat.com/product/blades-in-the-dark/',
  },
  {
    slug: 'blue-rose',
    label: 'Blue Rose',
    category: 'Narrative, PbtA & Queer Indie',
    description:
      'The definitive "romantic fantasy" roleplaying game focusing on cooperation, animal companions, complex social intrigue, and inclusive heroic storytelling.',
    resourceUrl: 'https://greenronin.com/bluerose/',
  },
  {
    slug: 'dream-askew',
    label: 'Dream Askew',
    category: 'Narrative, PbtA & Queer Indie',
    description:
      'A highly influential, diceless, GM-less game focusing on a queer enclave trying to survive and find community amid a crumbling post-apocalyptic backdrop.',
    resourceUrl: 'https://buriedwithoutceremony.com/dream-askew',
  },
  {
    slug: 'girl-by-moonlight',
    label: 'Girl by Moonlight',
    category: 'Narrative, PbtA & Queer Indie',
    description:
      'A striking, Forged in the Dark mechanical adaptation explicitly designed to explore the struggles, bonds, and defiant hope found in the magical girl anime genre.',
    resourceUrl: 'https://evilhat.com/product/girl-by-moonlight/',
  },
  {
    slug: 'glitter-hearts',
    label: 'Glitter Hearts',
    category: 'Narrative, PbtA & Queer Indie',
    description:
      'An action-packed, collaborative PbtA magical girl game that lets players construct a dual-identity hero, balancing mundane high school life with neon team superpower fights.',
    resourceUrl: 'https://www.levesquegames.com/',
  },
  {
    slug: 'monsterhearts',
    label: 'Monsterhearts',
    category: 'Narrative, PbtA & Queer Indie',
    description:
      'A critical darling PbtA game that explores the messy, volatile, and deeply emotional lives of teenage monsters grappling with adolescent desire and social isolation.',
    resourceUrl: 'https://buriedwithoutceremony.com/monsterhearts',
  },
  {
    slug: 'pbta',
    label: 'Powered by the Apocalypse (PbtA)',
    category: 'Narrative, PbtA & Queer Indie',
    description:
      'Not a single game, but a flexible fiction-first design philosophy and engine utilizing descriptive "Moves" triggered directly by in-character roleplay.',
    resourceUrl: 'http://apocalypse-world.com/pbta/',
  },
  {
    slug: 'thirsty-sword-lesbians',
    label: 'Thirsty Sword Lesbians',
    category: 'Narrative, PbtA & Queer Indie',
    description:
      'A celebration of queer representation, focusing on high-melodrama sword duels, passionate romance, systemic rebellion, and emotional redemptions.',
    resourceUrl: 'https://evilhat.com/product/thirsty-sword-lesbians/',
  },

  // Genre-Agnostic Sandbox Tools
  {
    slug: 'cypher-system',
    label: 'Cypher System',
    category: 'Genre-Agnostic Sandbox Tools',
    description:
      'A fast-paced, rules-light pool engine developed by Monte Cook Games that heavily emphasizes asset exploration, player-driven resource spend, and GM flexibility.',
    resourceUrl: 'https://www.montecookgames.com/store/product/cypher-system-rulebook-2/',
  },
  {
    slug: 'fate',
    label: 'FATE',
    category: 'Genre-Agnostic Sandbox Tools',
    description:
      'A brilliantly simple narrative game system that completely replaces traditional numerical attributes with player-invented descriptive "Aspects" and a highly collaborative narrative token economy.',
    resourceUrl: 'https://evilhat.com/product/fate-core/',
  },
  {
    slug: 'gurps',
    label: 'GURPS',
    category: 'Genre-Agnostic Sandbox Tools',
    description:
      'The Generic Universal RolePlaying System. A legendary, highly modular d6 simulator designed to mathematically accommodate absolutely any genre or cross-epoch game style imaginable.',
    resourceUrl: 'http://www.sjgames.com/gurps/',
  },
  {
    slug: 'savage-worlds',
    label: 'Savage Worlds',
    category: 'Genre-Agnostic Sandbox Tools',
    description:
      'A swingy, pulse-pounding explosion-die tactical system designed around a fast, cinematic mantra that lets Game Masters seamlessly spin up any pulp genre quickly.',
    resourceUrl: 'https://peginc.com/savage-worlds/',
  },

  // Other
  {
    slug: 'other',
    label: 'Other',
    category: 'Other',
    description:
      'Select this option if your game system is not listed. You can enter a custom ruleset name in campaign settings.',
    resourceUrl: '',
  },
];

export const GAME_SYSTEM_SLUGS = new Set(GAME_SYSTEMS.map((s) => s.slug));

export const DEFAULT_GAME_SYSTEM_SLUG = 'dnd-5e';

/** Legacy Prisma enum values mapped to new slugs for migration and backup restore. */
export const LEGACY_GAME_SYSTEM_MAP: Record<string, string> = {
  DND: 'dnd-5e',
  PATHFINDER: 'pathfinder-2e',
  DAGGERHEART: 'daggerheart',
  OTHER: 'other',
};

export function isValidGameSystemSlug(slug: string): boolean {
  return GAME_SYSTEM_SLUGS.has(slug);
}

export function normalizeGameSystemSlug(
  slug: string | null | undefined,
): string | null {
  if (slug == null || slug === '') return null;
  const legacy = LEGACY_GAME_SYSTEM_MAP[slug];
  if (legacy) return legacy;
  return slug;
}

export function getGameSystemEntry(slug: string | null | undefined): GameSystemEntry | undefined {
  if (!slug) return undefined;
  const normalized = normalizeGameSystemSlug(slug);
  return GAME_SYSTEMS.find((s) => s.slug === normalized);
}

export function getGameSystemLabel(
  slug: string | null | undefined,
  customName?: string | null,
): string {
  if (!slug) return 'System TBD';
  const normalized = normalizeGameSystemSlug(slug);
  if (normalized === 'other') {
    const trimmed = customName?.trim();
    return trimmed || 'Other';
  }
  const entry = getGameSystemEntry(normalized);
  return entry?.label ?? slug;
}

export function getGameSystemsByCategory(): Map<string, GameSystemEntry[]> {
  const map = new Map<string, GameSystemEntry[]>();
  for (const category of GAME_SYSTEM_CATEGORIES) {
    map.set(
      category,
      GAME_SYSTEMS.filter((s) => s.category === category),
    );
  }
  return map;
}
