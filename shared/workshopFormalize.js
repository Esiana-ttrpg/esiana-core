"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LORE_NOTE_FOLDER_TITLES = exports.WORKSHOP_FORMALIZE_TARGET_LABELS = void 0;
exports.extractSummaryFromMarkdown = extractSummaryFromMarkdown;
exports.WORKSHOP_FORMALIZE_TARGET_LABELS = {
    character: {
        label: 'Character',
        description: 'Cast member with biography from draft',
    },
    quest: {
        label: 'Quest',
        description: 'Adventure hook',
    },
    thread: {
        label: 'Thread',
        description: 'Open narrative thread',
    },
    scene: {
        label: 'Scene',
        description: 'Planned scene beat',
    },
    lore_note: {
        label: 'Lore note',
        description: 'Freeform wiki entry in a lore folder',
    },
};
/** Lore folders under World eligible for lore_note formalize (excludes Party, Journals, etc.). */
exports.LORE_NOTE_FOLDER_TITLES = [
    'Characters',
    'Locations',
    'Organizations',
    'Objects',
    'Families',
    'Bestiary',
    'Ancestries',
    'Maps',
];
function extractSummaryFromMarkdown(body, maxLen = 300) {
    const trimmed = body.trim();
    if (!trimmed)
        return '';
    const paragraph = trimmed
        .split(/\n\s*\n/)
        .map((part) => part.replace(/\s+/g, ' ').trim())
        .find((part) => part.length > 0);
    if (!paragraph)
        return '';
    if (paragraph.length <= maxLen)
        return paragraph;
    return `${paragraph.slice(0, maxLen - 1).trimEnd()}…`;
}
//# sourceMappingURL=workshopFormalize.js.map