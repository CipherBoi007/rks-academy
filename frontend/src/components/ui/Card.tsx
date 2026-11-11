import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  outlined,
  className,
  ...rest
}: ComponentProps<"div"> & { outlined?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white shadow-card",
        outlined ? "border border-ink" : "border border-line",
        className,
      )}
      {...rest}
    />
  );
}

/** Oswald uppercase card heading with an optional right-hand slot. */
export function CardTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="font-display text-xl font-semibold uppercase leading-tight tracking-wide">{children}</h2>
      {action}
    </div>
  );
}
