import { pickInt } from './rng.js';

export type SimulationDensity = 'quiet' | 'active' | 'obsessive';
export type SimulationBeat = 'session' | 'lull' | 'obsessive';

/** Monotonic simulated campaign clock — all generators consume clock.now(). */
export class SimulationClock {
  private _current: Date;
  private _rng: () => number;

  constructor(start: Date, rng: () => number) {
    this._current = new Date(start.getTime());
    this._rng = rng;
  }

  now(): Date {
    return new Date(this._current.getTime());
  }

  advanceDays(n: number): void {
    this._current.setUTCDate(this._current.getUTCDate() + n);
  }

  advanceHours(n: number): void {
    this._current.setUTCHours(this._current.getUTCHours() + n);
  }

  advanceToNextBeat(beat: SimulationBeat, density: SimulationDensity = 'active'): void {
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
