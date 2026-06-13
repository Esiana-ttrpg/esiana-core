"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatRelativeEpochLabel = formatRelativeEpochLabel;
const MINUTES_PER_DAY = 1440n;
function formatRelativeEpochLabel(atEpochMinute, currentEpochMinute) {
    if (!atEpochMinute)
        return null;
    try {
        const at = BigInt(atEpochMinute);
        const diff = currentEpochMinute - at;
        if (diff <= 0n)
            return 'Just now';
        const days = diff / MINUTES_PER_DAY;
        if (days === 0n)
            return 'Today';
        if (days === 1n)
            return '1 day ago';
        if (days < 7n)
            return `${days.toString()} days ago`;
        const weeks = days / 7n;
        if (weeks === 1n)
            return '1 week ago';
        if (weeks < 5n)
            return `${weeks.toString()} weeks ago`;
        const months = days / 30n;
        if (months === 1n)
            return '1 month ago';
        return `${months.toString()} months ago`;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=relativeEpochLabel.js.map