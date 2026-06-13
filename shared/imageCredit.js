"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MADE_WITH_SUGGESTIONS = exports.IMAGE_CREDIT_DISCLAIMER = void 0;
exports.normalizeImageCredit = normalizeImageCredit;
exports.imageCreditDisplayRows = imageCreditDisplayRows;
exports.hasImageCredit = hasImageCredit;
exports.IMAGE_CREDIT_DISCLAIMER = 'Credits are optional and may not always reflect ownership or reuse rights.';
exports.MADE_WITH_SUGGESTIONS = [
    'HeroForge',
    'Picrew',
    'Rinmaru',
    'DungeonDraft',
    'Inkarnate',
    'Wonderdraft',
    'Midjourney',
    'SDXL',
    "Baldur's Gate 3 character creator",
];
function trimText(raw) {
    if (typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function normalizeCreditUrl(raw) {
    const text = trimText(raw);
    if (!text)
        return null;
    if (text.startsWith('http://') || text.startsWith('https://'))
        return text;
    return null;
}
function normalizeImageCredit(raw) {
    if (raw === null || raw === undefined)
        return null;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const obj = raw;
    const artCredit = trimText(obj.artCredit);
    const source = trimText(obj.source);
    const madeWith = trimText(obj.madeWith);
    const artCreditUrl = artCredit ? normalizeCreditUrl(obj.artCreditUrl) : null;
    const sourceUrl = source ? normalizeCreditUrl(obj.sourceUrl) : null;
    const madeWithUrl = madeWith ? normalizeCreditUrl(obj.madeWithUrl) : null;
    if (!artCredit && !source && !madeWith)
        return null;
    return {
        artCredit,
        artCreditUrl,
        source,
        sourceUrl,
        madeWith,
        madeWithUrl,
    };
}
function imageCreditDisplayRows(credit) {
    const normalized = credit ? normalizeImageCredit(credit) : null;
    if (!normalized)
        return [];
    const rows = [];
    if (normalized.artCredit) {
        rows.push({
            label: 'Art credit',
            text: normalized.artCredit,
            href: normalized.artCreditUrl ?? undefined,
        });
    }
    if (normalized.source) {
        rows.push({
            label: 'Source',
            text: normalized.source,
            href: normalized.sourceUrl ?? undefined,
        });
    }
    if (normalized.madeWith) {
        rows.push({
            label: 'Made with',
            text: normalized.madeWith,
            href: normalized.madeWithUrl ?? undefined,
        });
    }
    return rows;
}
function hasImageCredit(credit) {
    return imageCreditDisplayRows(credit).length > 0;
}
//# sourceMappingURL=imageCredit.js.map