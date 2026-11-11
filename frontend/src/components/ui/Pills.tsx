"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface PillOption<T extends string | number> {
  value: T;
  label: string;
}

/** Single-select pills (a radiogroup). The active pill is yellow with black text. Arrow keys move focus. */
export function PillGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className,
  scroll,
}: {
  label: string;
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  scroll?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex gap-2", scroll ? "scrollbar-none relative -mx-1 overflow-x-auto px-1 py-0.5" : "flex-wrap", className)}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "h-11 shrink-0 rounded-full border px-5 text-[15px] transition-colors",
              active ? "border-ink/80 bg-accent font-semibold text-ink" : "border-line bg-white text-ink/80 hover:bg-surface",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
