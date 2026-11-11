import type { Gender, Level, ProductCategory } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const rupeeFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** ₹15,000 · ₹1,25,000 (Indian grouping). Paise only when present. */
export function inr(amount: number): string {
  return `₹${rupeeFormat.format(amount)}`;
}

/** Parses "2026-11-05" as a calendar date, with no timezone shift. */
export function parseDate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

/** "05 Nov 2026" */
export function formatDate(iso: string): string {
  const { y, m, d } = parseDate(iso);
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

/** "Nov 2026" */
export function formatMonth(iso: string): string {
  const { y, m } = parseDate(iso);
  return `${MONTHS[m - 1]} ${y}`;
}

/** "Nov 2026" or "Nov 2026 – Jan 2027" for a billing period. */
export function formatPeriod(from: string, to: string): string {
  return formatMonth(from) === formatMonth(to) ? formatMonth(from) : `${formatMonth(from)} – ${formatMonth(to)}`;
}

/** "THURSDAY, 05 NOV 2026" style eyebrow (caller uppercases via CSS). */
export function formatLongDate(iso: string): string {
  const { y, m, d } = parseDate(iso);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${formatDate(iso)}`;
}

/** "06:00:00" becomes "6:00 AM". */
export function formatTime(time: string): string {
  const [h, min] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(min).padStart(2, "0")} ${suffix}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

/** Shifts an ISO date by whole days. */
export function addDays(iso: string, days: number): string {
  const { y, m, d } = parseDate(iso);
  return toIso(new Date(Date.UTC(y, m - 1, d + days)));
}

/** "2026-11-05" becomes "2026-12-01". */
export function firstOfNextMonth(iso: string): string {
  const { y, m } = parseDate(iso);
  return toIso(new Date(Date.UTC(y, m, 1)));
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 0 = Monday ... 6 = Sunday */
export function weekdayIndex(iso: string): number {
  const { y, m, d } = parseDate(iso);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** "9000000101" becomes "+91 90000 00101". */
export function formatMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "").slice(-10);
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : mobile;
}

export const LEVEL_LABEL: Record<Level, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  TOURNAMENT: "Tournament",
};

export const LEVELS: Level[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "TOURNAMENT"];

export const GENDER_LABEL: Record<Gender, string> = { MALE: "Boy", FEMALE: "Girl", OTHER: "Other" };

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  RACKETS: "Rackets",
  SHUTTLECOCKS: "Shuttlecocks",
  SHOES: "Shoes",
  GRIPS: "Grips",
  BAGS: "Bags",
  JERSEYS: "Jerseys",
};

export function planPeriodLabel(periodMonths: number): string {
  if (periodMonths === 1) return "per month";
  if (periodMonths === 12) return "per year";
  return `per ${periodMonths} months`;
}
