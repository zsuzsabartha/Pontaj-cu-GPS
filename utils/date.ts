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
