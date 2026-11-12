"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { monthCells, monthStart, monthTitle, shiftMonth, WEEKDAY_INITIALS } from "@/lib/calendar";
import { addDays, formatLongDate } from "@/lib/format";

/** A field-styled button that opens a month calendar in the app's palette. Dates after max can't be picked. */
export function DatePicker({
  value,
  onChange,
  max,
  label,
}: {
  value: string;
  onChange: (iso: string) => void;
  max?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthStart(value || max || "2000-01-01"));
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open && value) setMonth(monthStart(value));
    setOpen((o) => !o);
  }

  function pick(iso: string) {
    onChange(iso);
    setOpen(false);
  }

  const canGoNext = !max || shiftMonth(month, 1) <= monthStart(max);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`${label}: ${value ? formatLongDate(value) : "not set"}`}
        className={cn(
          "flex h-12 w-full items-center gap-3 rounded-xl border bg-white px-3.5 text-left text-[15px] text-ink",
          open ? "border-primary ring-2 ring-primary/30" : "border-line",
        )}
      >
        <Calendar className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <span className="flex-1 truncate font-medium">{value ? formatLongDate(value) : "Pick a date"}</span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={`Choose ${label.toLowerCase()}`}
          className="absolute inset-x-0 top-full z-40 mt-2 animate-fade-in rounded-2xl border border-line bg-white p-3 shadow-sheet"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, -1))}
              aria-label="Previous month"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-primary hover:bg-primary-50"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <p className="font-display text-lg font-semibold uppercase tracking-wide" aria-live="polite">
              {monthTitle(month)}
            </p>
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, 1))}
              disabled={!canGoNext}
              aria-label="Next month"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-primary hover:bg-primary-50 disabled:text-ink/20 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center" role="grid">
            {WEEKDAY_INITIALS.map((d, i) => (
              <span key={i} className="pb-1 text-xs font-semibold text-muted" aria-hidden>
                {d}
              </span>
            ))}
            {monthCells(month).map((iso, i) => {
              if (!iso) return <span key={`blank-${i}`} aria-hidden />;
              const disabled = Boolean(max && iso > max);
              const selected = iso === value;
              const isToday = iso === max;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(iso)}
                  aria-pressed={selected}
                  aria-label={formatLongDate(iso)}
                  className={cn(
                    "mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-[15px] font-medium transition-colors",
                    selected
                      ? "bg-primary font-semibold text-white shadow-hard-sm"
                      : disabled
                        ? "text-ink/20"
                        : "text-ink hover:bg-primary-50",
                    isToday && !selected && "ring-2 ring-inset ring-accent",
                  )}
                >
                  {Number(iso.slice(8))}
                </button>
              );
            })}
          </div>

          {max && (
            <div className="mt-3 flex gap-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={() => pick(max)}
                className="h-10 flex-1 rounded-xl bg-accent text-sm font-semibold text-ink hover:brightness-95"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => pick(addDays(max, -1))}
                className="h-10 flex-1 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-surface"
              >
                Yesterday
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
