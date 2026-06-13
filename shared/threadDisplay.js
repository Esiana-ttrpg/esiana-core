"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.THREAD_KIND_GROUP_LABELS = exports.THREAD_KIND_DISPLAY_ORDER = void 0;
exports.isAuthoredThreadKind = isAuthoredThreadKind;
exports.isPlayerTheoryThread = isPlayerTheoryThread;
exports.allThreadKinds = allThreadKinds;
/**
 * Thread kind display order and labels for hub grouping (extensible without render rewrites).
 */
const threadMetadata_js_1 = require("./threadMetadata.js");
/** Authored kinds only — theories render in a separate hub zone. */
exports.THREAD_KIND_DISPLAY_ORDER = [
    'mystery',
    'promise',
    'foreshadowing',
    'clue',
];
exports.THREAD_KIND_GROUP_LABELS = {
    mystery: 'Mysteries',
    promise: 'Promises',
    foreshadowing: 'Foreshadowing',
    clue: 'Clues',
    theory: 'Theories',
};
function isAuthoredThreadKind(kind) {
    return kind !== 'theory';
}
function isPlayerTheoryThread(kind, playerSubmitted) {
    return kind === 'theory' || playerSubmitted;
}
function allThreadKinds() {
    return threadMetadata_js_1.THREAD_KINDS;
}
//# sourceMappingURL=threadDisplay.js.map