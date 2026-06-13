"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.THREAD_SIGNAL_LABELS = exports.THREAD_STALE_DAYS_THRESHOLD = exports.THREAD_SIGNAL_IDS = void 0;
exports.computeThreadSignals = computeThreadSignals;
exports.THREAD_SIGNAL_IDS = [
    'stale',
    'dangling_foreshadowing',
    'unresolved_promise',
    'theory_contradiction',
];
exports.THREAD_STALE_DAYS_THRESHOLD = 60;
function computeThreadSignals(input) {
    const signals = [];
    const now = Date.now();
    const ageMs = now - input.updatedAt.getTime();
    const staleMs = exports.THREAD_STALE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000;
    if (input.threadStatus === 'OPEN' &&
        ageMs > staleMs &&
        !input.lastAdvancedSessionId) {
        signals.push('stale');
    }
    if (input.threadKind === 'foreshadowing' && !input.payoffPageId) {
        signals.push('dangling_foreshadowing');
    }
    if (input.threadKind === 'promise' &&
        input.threadStatus === 'OPEN' &&
        ageMs > staleMs) {
        signals.push('unresolved_promise');
    }
    if (input.threadKind === 'theory' &&
        input.payoffPageId &&
        input.threadStatus === 'RESOLVED') {
        signals.push('theory_contradiction');
    }
    return signals;
}
exports.THREAD_SIGNAL_LABELS = {
    stale: 'Stale',
    dangling_foreshadowing: 'No payoff linked',
    unresolved_promise: 'Long-running promise',
    theory_contradiction: 'Resolved theory',
};
//# sourceMappingURL=threadSignals.js.map