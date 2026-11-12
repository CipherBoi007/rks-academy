"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { monthCells, monthStart, monthTitle, shiftMonth, WEEKDAY_INITIALS } from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import type { PlayerAttendance } from "@/lib/types";

/**
 * One month as a calendar (the phone view of attendance): a numbered box per day, blue for present, orange for
 * absent, grey for no session. Arrows step through the months the record covers. Today gets a yellow ring.
 */
export function AttendanceMonth({ data, today }: { data: PlayerAttendance; today: string }) {
  const first = monthStart(data.from);
  const last = monthStart(today);
  const [month, setMonth] = useState(last);
  const status = new Map(data.days.map((d) => [d.date, d.status]));
  const inMonth = data.days.filter((d) => d.date.startsWith(month.slice(0, 7)));
  const present = inMonth.filter((d) => d.status === "PRESENT").length;
  const absent = inMonth.length - present;
  const pct = inMonth.length ? Math.round((present / inMonth.length) * 100) : null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          disabled={month <= first}
          aria-label="Previous month"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line text-primary disabled:text-ink/20"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <p className="text-center" aria-live="polite">
          <span className="block font-display text-lg font-semibold uppercase tracking-wide">{monthTitle(month)}</span>
          <span className="block text-xs text-muted">{pct === null ? "No sessions" : `${pct}% this month`}</span>
        </p>
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={month >= last}
          aria-label="Next month"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line text-primary disabled:text-ink/20"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label={`Attendance in ${monthTitle(month)}`}>
        {WEEKDAY_INITIALS.map((d, i) => (
          <span key={i} className="text-center text-xs font-semibold text-muted" aria-hidden>
            {d}
          </span>
        ))}
        {monthCells(month).map((iso, i) => {
          if (!iso) return <span key={`blank-${i}`} aria-hidden />;
          const s = status.get(iso);
          const future = iso > today;
          return (
            <span
              key={iso}
              title={`${formatDate(iso)}: ${s === "PRESENT" ? "Present" : s === "ABSENT" ? "Absent" : "No session"}`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-sm font-semibold",
                s === "PRESENT" ? "bg-primary text-white" : s === "ABSENT" ? "bg-alert text-white" : "bg-surface text-ink/50",
                future && "opacity-40",
                iso === today && "ring-2 ring-accent ring-offset-1",
              )}
            >
              {Number(iso.slice(8))}
              <span className="sr-only">
                {formatDate(iso)} {s === "PRESENT" ? "present" : s === "ABSENT" ? "absent" : "no session"}
              </span>
            </span>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/80">
        <li className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-primary" aria-hidden /> Present ({present})
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-alert" aria-hidden /> Absent ({absent})
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-surface ring-1 ring-line" aria-hidden /> No session
        </li>
      </ul>
    </div>
  );
}
