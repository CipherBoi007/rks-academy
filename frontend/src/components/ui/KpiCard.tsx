import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "./States";

type Tone = "accent" | "alert" | "primary";

const bars: Record<Tone, string> = { accent: "bg-accent", alert: "bg-alert", primary: "bg-primary" };

/** White KPI card with the short coloured accent bar on its top edge. */
export function KpiCard({
  label,
  value,
  meta,
  icon,
  tone = "accent",
  compact,
  loading,
}: {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  compact?: boolean;
  loading?: boolean;
}) {
  return (
    <div className={cn("relative rounded-2xl border border-line bg-white shadow-card", compact ? "p-4" : "p-4 sm:p-5")}>
      <span className={cn("absolute -top-px left-3 h-1 w-10 rounded-full", bars[tone])} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && (
          <span
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              tone === "alert" ? "bg-alert-50 text-alert" : "bg-primary text-white",
            )}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className={cn("mt-3 h-8 w-28", compact && "mt-2")} />
      ) : (
        <p
          className={cn(
            "font-display font-bold leading-none",
            compact ? "mt-1 text-[28px]" : "mt-3 text-[26px] sm:mt-5 sm:text-[34px]",
            tone === "alert" ? "text-alert" : "text-ink",
          )}
        >
          {value}
        </p>
      )}
      {meta && !loading && <p className="mt-2 text-[13px] text-muted sm:text-sm">{meta}</p>}
    </div>
  );
}
