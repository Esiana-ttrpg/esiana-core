"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.driftFingerprint = driftFingerprint;
/**
 * Server-side drift fingerprinting (Node crypto — not for browser bundles).
 */
const node_crypto_1 = require("node:crypto");
function driftFingerprint(bucket, subjectKind, subjectId, suffix) {
    const raw = [bucket, subjectKind, subjectId, suffix ?? ''].filter(Boolean).join('|');
    return (0, node_crypto_1.createHash)('sha256').update(raw).digest('hex').slice(0, 24);
}
//# sourceMappingURL=creativeDriftFingerprint.js.map