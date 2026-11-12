import { parseDate, toIso, weekdayIndex } from "./format";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

/** "2026-11-17" becomes "2026-11-01". */
export function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Moves a month start by whole months: shiftMonth("2026-01-01", -1) is "2025-12-01". */
export function shiftMonth(monthIso: string, months: number): string {
  const { y, m } = parseDate(monthIso);
  return toIso(new Date(Date.UTC(y, m - 1 + months, 1)));
}

/** "November 2026" */
export function monthTitle(monthIso: string): string {
  const { y, m } = parseDate(monthIso);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** A Monday-first month grid: leading nulls for the days before the 1st, then every date of the month. */
export function monthCells(monthIso: string): (string | null)[] {
  const { y, m } = parseDate(monthIso);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = weekdayIndex(monthIso);
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => toIso(new Date(Date.UTC(y, m - 1, i + 1)))),
  ];
}
