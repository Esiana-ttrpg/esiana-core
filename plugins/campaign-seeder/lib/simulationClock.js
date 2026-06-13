import { pickInt } from './rng.js';

/**
 * Monotonic simulated campaign clock — all generators consume clock.now().
 */
export class SimulationClock {
  /** @param {Date} start @param {() => number} rng */
  constructor(start, rng) {
    this._current = new Date(start.getTime());
    this._rng = rng;
  }

  now() {
    return new Date(this._current.getTime());
  }

  advanceDays(n) {
    this._current.setUTCDate(this._current.getUTCDate() + n);
  }

  advanceHours(n) {
    this._current.setUTCHours(this._current.getUTCHours() + n);
  }

  /** @param {'session' | 'lull' | 'obsessive'} beat @param {'quiet' | 'active' | 'obsessive'} density */
  advanceToNextBeat(beat, density = 'active') {
    if (beat === 'session') {
      this.advanceDays(pickInt(this._rng, 2, 5));
      this.advanceHours(pickInt(this._rng, 10, 18));
    } else if (beat === 'lull') {
      this.advanceDays(pickInt(this._rng, 1, density === 'quiet' ? 4 : 2));
    } else if (beat === 'obsessive') {
      this.advanceHours(pickInt(this._rng, 1, 4));
    }
  }
}
