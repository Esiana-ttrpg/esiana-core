/** Deterministic mulberry32 PRNG from a string seed. */
export function createRng(seedString) {
  let h = 1779033703;
  for (let i = 0; i < seedString.length; i += 1) {
    h = Math.imul(h ^ seedString.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;

  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, list) {
  if (!list.length) return undefined;
  return list[Math.floor(rng() * list.length)];
}

export function pickInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function chance(rng, probability) {
  return rng() < probability;
}
