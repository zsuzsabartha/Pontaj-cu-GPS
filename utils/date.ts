// Date helpers based on the device's local calendar (Europe/Bucharest for Bioeel users).
// Avoid `toISOString().split('T')[0]`: it returns the UTC date, which is the previous day
// between 00:00 and 02:59/03:59 local time.

const pad = (n: number) => String(n).padStart(2, '0');

/** Returns the local calendar date as `YYYY-MM-DD`. */
export const toLocalDateISO = (d: Date = new Date()): string =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Returns the local calendar month as `YYYY-MM`. */
export const toLocalMonthISO = (d: Date = new Date()): string =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** Parses a `YYYY-MM-DD` string as local midnight (not UTC midnight). */
export const parseLocalDate = (iso: string): Date => new Date(`${iso}T00:00:00`);

/** Formats a date (`YYYY-MM-DD`, ISO string or Date) as `DD.MM.YYYY` (Bioeel standard). */
export const formatDateRO = (input?: string | Date | null): string => {
    if (!input) return '-';
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        const [y, m, d] = input.split('-');
        return `${d}.${m}.${y}`;
    }
    const dt = typeof input === 'string' ? new Date(input) : input;
    if (isNaN(dt.getTime())) return String(input);
    return `${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()}`;
};

/**
 * Counts working days (Monday-Friday, excluding legal holidays) between two `YYYY-MM-DD` dates inclusive.
 */
export const countWorkingDays = (
    startDateISO: string,
    endDateISO: string,
    holidays: { date: string }[] = []
): number => {
    if (!startDateISO || !endDateISO) return 0;
    const start = parseLocalDate(startDateISO.slice(0, 10));
    const end = parseLocalDate(endDateISO.slice(0, 10));
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

    const holidaySet = new Set(holidays.map(h => h.date.slice(0, 10)));
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
        const dow = cur.getDay();
        const iso = toLocalDateISO(cur);
        if (dow !== 0 && dow !== 6 && !holidaySet.has(iso)) {
            count++;
        }
        cur.setDate(cur.getDate() + 1);
    }
    return count;
};
