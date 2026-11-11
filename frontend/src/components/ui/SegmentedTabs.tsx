"use client";

import { cn } from "@/lib/cn";

export function SegmentedTabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  className,
}: {
  label: string;
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex justify-center rounded-xl bg-white/60 p-1 ring-1 ring-line", className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            id={`tab-${t.value}`}
            aria-selected={active}
            aria-controls={`panel-${t.value}`}
            onClick={() => onChange(t.value)}
            className={cn(
              "h-11 flex-1 whitespace-nowrap rounded-xl px-4 text-[15px] font-semibold transition-colors sm:flex-none sm:px-5",
              active ? "bg-primary text-white" : "text-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
