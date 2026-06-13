"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOWNTIME_PLACEHOLDER_FRAMING = exports.DOWNTIME_SECTIONS = exports.DOWNTIME_HUB_TITLE = void 0;
exports.normalizeDowntimeSection = normalizeDowntimeSection;
exports.DOWNTIME_HUB_TITLE = 'Downtime';
exports.DOWNTIME_SECTIONS = [
    { id: 'projects', label: 'Projects' },
    { id: 'havens', label: 'Havens' },
    { id: 'worldEvents', label: 'World Events' },
    { id: 'reputation', label: 'Reputation' },
    { id: 'ledger', label: 'Ledger' },
];
function normalizeDowntimeSection(raw) {
    if (typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    if (trimmed.toLowerCase() === 'worldevents')
        return 'worldEvents';
    const lower = trimmed.toLowerCase();
    const match = exports.DOWNTIME_SECTIONS.find((section) => section.id.toLowerCase() === lower);
    return match?.id ?? null;
}
exports.DOWNTIME_PLACEHOLDER_FRAMING = {
    projects: {
        headline: 'No active projects.',
        body: [
            'Long-term operations, research, repairs, construction, and faction initiatives will appear here.',
            'Projects advance when time passes — not when you check a task board.',
        ],
        phase: 2,
    },
    havens: {
        headline: 'No havens registered yet.',
        body: [
            'Operational bases — ships, strongholds, sanctuaries, and crew quarters — will take shape here.',
            'Each haven will carry its own rhythm of activity, threat, and upkeep.',
        ],
        phase: 3,
    },
    reputation: {
        headline: 'Reputation shifts quietly.',
        body: [
            'Faction trust, notoriety, and rumor will surface here as the world reacts to your choices.',
            'Consequences accumulate between sessions — often before anyone notices.',
        ],
        phase: 5,
    },
    ledger: {
        headline: 'The treasury awaits its first ledger.',
        body: [
            'Major income, expenses, debts, and project costs will appear as narrative line items — not a spreadsheet.',
            'Shared party funds and upkeep will live here when the campaign needs them.',
        ],
        phase: 4,
    },
};
//# sourceMappingURL=downtimeHub.js.map