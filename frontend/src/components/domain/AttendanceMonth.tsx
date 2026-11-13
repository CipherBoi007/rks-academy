"use client";

import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CardTitle } from "@/components/ui/Card";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { monthCells, monthStart, monthTitle, shiftMonth, WEEKDAY_INITIALS } from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import type { PlayerAttendance } from "@/lib/types";

/**
 * A player's attendance one month at a time, as a calendar: a numbered box per day, blue for present, orange for
 * absent, grey for no session, and a yellow ring on today. Arrows go back to the month the player joined. Each
 * month is fetched on its own, so history isn't limited to a fixed window. md and up: the month's totals sit
 * in a row of tiles under the calendar (beside it they get squeezed in half-width cards).
 */
export function AttendanceMonth({
  playerId,
  joinDate,
  today,
  useAttendance,
}: {
  playerId: number;
  joinDate: string;
  today: string;
  useAttendance: (id: number, month: string) => UseQueryResult<PlayerAttendance>;
}) {
  const first = monthStart(joinDate < today ? joinDate : today);
  const last = monthStart(today);
  const [month, setMonth] = useState(last);
  const query = useAttendance(playerId, month);
  const data = query.isPlaceholderData ? undefined : query.data;
  const status = new Map(data?.days.map((d) => [d.date, d.status]));
  const sessions = data ? data.present + data.absent : 0;

  return (
    <>
      <CardTitle action={sessions > 0 && <span className="font-display text-3xl font-bold text-primary">{data?.pct}%</span>}>
        Attendance
      </CardTitle>

      <div className="mt-5">
        <div className="md:max-w-[440px]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <MonthButton direction="prev" disabled={month <= first} onClick={() => setMonth(shiftMonth(month, -1))} />
            <p className="text-center font-display text-lg font-semibold uppercase tracking-wide" aria-live="polite">
              {monthTitle(month)}
            </p>
            <MonthButton direction="next" disabled={month >= last} onClick={() => setMonth(shiftMonth(month, 1))} />
          </div>

          {query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : (
            <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label={`Attendance in ${monthTitle(month)}`} aria-busy={!data}>
              {WEEKDAY_INITIALS.map((d, i) => (
                <span key={i} className="text-center text-xs font-semibold text-muted" aria-hidden>
                  {d}
                </span>
              ))}
              {monthCells(month).map((iso, i) => {
                if (!iso) return <span key={`blank-${i}`} aria-hidden />;
                if (!data) return <Skeleton key={iso} className="aspect-square rounded-lg" />;
                const s = status.get(iso);
                const future = iso > today;
                const label = s === "PRESENT" ? "Present" : s === "ABSENT" ? "Absent" : "No session";
                return (
                  <span
                    key={iso}
                    title={`${formatDate(iso)}: ${label}`}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-lg text-sm font-semibold",
                      s === "PRESENT" ? "bg-primary text-white" : s === "ABSENT" ? "bg-alert text-white" : "bg-surface text-ink/50",
                      future && "opacity-40",
                      iso === today && "ring-2 ring-accent ring-offset-1",
                    )}
                  >
                    {Number(iso.slice(8))}
                    <span className="sr-only">
                      {formatDate(iso)} {label.toLowerCase()}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 md:mt-5">
          {/* md and up: the month's numbers as tiles. */}
          <dl className="hidden grid-cols-4 gap-3 md:grid">
            <Stat label="Present" value={data?.present} tone="text-primary" />
            <Stat label="Absent" value={data?.absent} tone="text-alert" />
            <Stat label="Sessions" value={data && sessions} />
            <Stat label="Attendance" value={data && (sessions ? `${data.pct}%` : "—")} />
          </dl>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/80 md:mt-5">
            <li className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded bg-primary" aria-hidden />
              <span>
                Present<span className="md:hidden"> ({data?.present ?? 0})</span>
              </span>
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded bg-alert" aria-hidden />
              <span>
                Absent<span className="md:hidden"> ({data?.absent ?? 0})</span>
              </span>
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded bg-surface ring-1 ring-line" aria-hidden /> No session
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}

function MonthButton({ direction, disabled, onClick }: { direction: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous month" : "Next month"}
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line text-primary hover:bg-primary-50 disabled:text-ink/20 disabled:hover:bg-transparent"
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string | undefined; tone?: string }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={cn("font-display text-3xl font-bold", tone)}>{value ?? "–"}</dd>
    </div>
  );
}
