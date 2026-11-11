"use client";

import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

export const SearchInput = forwardRef<HTMLInputElement, ComponentProps<"input"> & { label: string }>(
  function SearchInput({ label, className, ...rest }, ref) {
    return (
      <div className={cn("relative", className)}>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          ref={ref}
          type="search"
          aria-label={label}
          className="h-12 w-full rounded-xl border border-line bg-white pl-11 pr-4 text-[15px] placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          {...rest}
        />
      </div>
    );
  },
);

/** Two or more equal buttons where one is selected (Cash / UPI). Selected is yellow with an ink outline. */
export function ChoiceGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-12 items-center justify-center gap-2 rounded-xl border text-[15px] font-semibold",
              active ? "border-ink bg-accent text-ink" : "border-line bg-white text-ink/80 hover:bg-surface",
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id: string;
}) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
      <span className="text-[15px] font-medium">{label}</span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-line")}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </label>
  );
}
