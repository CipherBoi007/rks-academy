import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A big black condensed title with actions on the right. On phones the actions drop below the title, unless
 * inlineActions keeps them level with it in the top-right corner (for one or two small buttons).
 * actionsClassName adjusts the phone layout of the actions row.
 */
export function PageHeader({
  title,
  actions,
  inlineActions,
  actionsClassName,
}: {
  title: string;
  actions?: ReactNode;
  inlineActions?: boolean;
  actionsClassName?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 gap-4 sm:mb-6 sm:flex sm:flex-row sm:items-end sm:justify-between",
        inlineActions ? "grid grid-cols-[minmax(0,1fr)_auto] items-center max-sm:gap-x-3" : "flex flex-col",
      )}
    >
      <h1 className="min-w-0 font-display text-[34px] font-bold uppercase leading-none sm:text-[40px]">{title}</h1>
      {actions && (
        <div className={cn("flex flex-wrap gap-3", inlineActions && "shrink-0 max-sm:flex-nowrap max-sm:gap-2", actionsClassName)}>
          {actions}
        </div>
      )}
    </div>
  );
}
