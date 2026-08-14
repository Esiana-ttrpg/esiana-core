const GLYPH_HEIGHT = 5;
const GLYPH_WIDTH = 5;

/** 5×5 block glyphs (A–Z, 0–9, space, hyphen). */
const GLYPHS: Record<string, string[]> = {
  A: [' ### ', '#   #', '#####', '#   #', '#   #'],
  B: ['#### ', '#   #', '#### ', '#   #', '#### '],
  C: [' ### ', '#   #', '#    ', '#   #', ' ### '],
  D: ['#### ', '#   #', '#   #', '#   #', '#### '],
  E: ['#####', '#    ', '#### ', '#    ', '#####'],
  F: ['#####', '#    ', '#### ', '#    ', '#    '],
  G: [' ### ', '#    ', '#  ##', '#   #', ' ### '],
  H: ['#   #', '#   #', '#####', '#   #', '#   #'],
  I: [' ### ', '  #  ', '  #  ', '  #  ', ' ### '],
  J: ['  ###', '   # ', '   # ', '#  # ', ' ##  '],
  K: ['#   #', '#  # ', '###  ', '#  # ', '#   #'],
  L: ['#    ', '#    ', '#    ', '#    ', '#####'],
  M: ['#   #', '## ##', '# # #', '#   #', '#   #'],
  N: ['#   #', '##  #', '# # #', '#  ##', '#   #'],
  O: [' ### ', '#   #', '#   #', '#   #', ' ### '],
  P: ['#### ', '#   #', '#### ', '#    ', '#    '],
  Q: [' ### ', '#   #', '#   #', '#  # ', ' ## #'],
  R: ['#### ', '#   #', '#### ', '#  # ', '#   #'],
  S: [' ####', '#    ', ' ### ', '    #', '#### '],
  T: ['#####', '  #  ', '  #  ', '  #  ', '  #  '],
  U: ['#   #', '#   #', '#   #', '#   #', ' ### '],
  V: ['#   #', '#   #', '#   #', ' # # ', '  #  '],
  W: ['#   #', '#   #', '# # #', '## ##', '#   #'],
  X: ['#   #', ' # # ', '  #  ', ' # # ', '#   #'],
  Y: ['#   #', ' # # ', '  #  ', '  #  ', '  #  '],
  Z: ['#####', '   # ', '  #  ', ' #   ', '#####'],
  '0': [' ### ', '#  ##', '# # #', '##  #', ' ### '],
  '1': ['  #  ', ' ##  ', '  #  ', '  #  ', ' ### '],
  '2': [' ### ', '#   #', '  ## ', ' #   ', '#####'],
  '3': [' ### ', '#   #', ' ### ', '#   #', ' ### '],
  '4': ['#   #', '#   #', '#####', '    #', '    #'],
  '5': ['#####', '#    ', '#### ', '    #', '#### '],
  '6': [' ### ', '#    ', '#### ', '#   #', ' ### '],
  '7': ['#####', '    #', '   # ', '  #  ', '  #  '],
  '8': [' ### ', '#   #', ' ### ', '#   #', ' ### '],
  '9': [' ### ', '#   #', ' ####', '    #', ' ### '],
  ' ': ['     ', '     ', '     ', '     ', '     '],
  '-': ['     ', '     ', ' ### ', '     ', '     '],
};

const BANNER_MAX_LENGTH = 20;
const BANNER_PATTERN = /^[A-Za-z0-9 -]+$/;

function glyphFor(char: string): string[] | null {
  const key = char === char.toLowerCase() ? char.toUpperCase() : char;
  return GLYPHS[key] ?? null;
}

/** Renders a small ASCII banner, or null if the title cannot be represented. */
export function renderAsciiBanner(title: string): string[] | null {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > BANNER_MAX_LENGTH || !BANNER_PATTERN.test(trimmed)) {
    return null;
  }

  const chars = trimmed.toUpperCase().split('');
  const rows: string[] = Array.from({ length: GLYPH_HEIGHT }, () => '');

  for (const char of chars) {
    const glyph = glyphFor(char);
    if (!glyph) return null;
    for (let row = 0; row < GLYPH_HEIGHT; row += 1) {
      const line = glyph[row] ?? ' '.repeat(GLYPH_WIDTH);
      rows[row] += (rows[row] ? ' ' : '') + line;
    }
  }

  return rows.map((line) => line.trimEnd());
}

export { GLYPH_HEIGHT, GLYPH_WIDTH };
