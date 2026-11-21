import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { LEVEL_LABEL } from "@/lib/format";
import type { FeeStatus, Level, PaymentMode, SlotStatus } from "@/lib/types";

const shape = "inline-flex items-center gap-1 rounded-full font-semibold leading-none whitespace-nowrap";

export function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn(shape, "px-2.5 py-1 text-xs", className)}>{children}</span>;
}

export function StatusChip({ status }: { status: FeeStatus }) {
  return (
    <span
      className={cn(
        shape,
        "px-2.5 py-1.5 text-[11px] uppercase tracking-wide text-white",
        status === "PAID" ? "bg-primary" : status === "DUE" ? "bg-alert" : "bg-muted",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
      {status === "PAID" ? "Paid" : status === "DUE" ? "Due" : "Left"}
    </span>
  );
}

const levelStyles: Record<Level, string> = {
  BEGINNER: "bg-chip text-ink",
  INTERMEDIATE: "border border-primary bg-white text-primary",
  ADVANCED: "border border-primary bg-primary-50 text-primary",
  TOURNAMENT: "border border-ink/80 bg-accent text-ink",
};

export function LevelChip({ level }: { level: Level }) {
  return <span className={cn(shape, "px-2.5 py-1 text-xs", levelStyles[level])}>{LEVEL_LABEL[level]}</span>;
}

export function ModeChip({ mode }: { mode: PaymentMode }) {
  return (
    <span className={cn(shape, "px-2.5 py-1 text-xs", mode === "UPI" ? "bg-primary-50 text-primary" : "bg-chip text-ink")}>
      {mode === "UPI" ? "UPI" : "Cash"}
    </span>
  );
}

const slotStyles: Record<SlotStatus, string> = {
  DONE: "bg-chip text-muted",
  LIVE: "bg-alert text-white",
  UPCOMING: "bg-primary-50 text-primary",
};

export function SlotChip({ status }: { status: SlotStatus }) {
  return (
    <span className={cn(shape, "px-2 py-1 text-[10px] uppercase tracking-wide", slotStyles[status])}>
      {status === "LIVE" ? "Live" : status === "DONE" ? "Done" : "Upcoming"}
    </span>
  );
}

/** The orange promo tag on product images ("18% OFF", "ACADEMY PRICE"). */
export function TagLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("rounded-md bg-alert px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white", className)}>
      {children}
    </span>
  );
}
