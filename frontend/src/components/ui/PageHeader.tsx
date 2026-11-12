import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Blue letter-spaced eyebrow over a big black condensed title, with actions on the right. On phones the actions
 * drop below the title, unless inlineActions keeps them in the top-right corner (for one or two small buttons):
 * then the eyebrow gets the full width and the actions sit level with the title.
 * actionsClassName adjusts the phone layout of the actions row.
 */
export function PageHeader({
  eyebrow,
  title,
  actions,
  inlineActions,
  actionsClassName,
}: {
  eyebrow: ReactNode;
  title: string;
  actions?: ReactNode;
  inlineActions?: boolean;
  actionsClassName?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 gap-4 sm:mb-6 sm:flex sm:flex-row sm:items-end sm:justify-between",
        inlineActions ? "grid grid-cols-[minmax(0,1fr)_auto] items-end max-sm:gap-x-3 max-sm:gap-y-0" : "flex flex-col",
      )}
    >
      {/* Phones with inlineActions: display:contents puts eyebrow and title straight into the grid. */}
      <div className={inlineActions ? "contents sm:block sm:min-w-0" : "min-w-0"}>
        <p className={cn("text-xs font-bold uppercase tracking-eyebrow text-primary", inlineActions && "col-span-2")}>{eyebrow}</p>
        <h1 className="mt-1 font-display text-[34px] font-bold uppercase leading-none sm:text-[40px]">{title}</h1>
      </div>
      {actions && (
        <div className={cn("flex flex-wrap gap-3", inlineActions && "shrink-0 max-sm:flex-nowrap max-sm:gap-2", actionsClassName)}>
          {actions}
        </div>
      )}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={`text-[11px] font-bold uppercase tracking-eyebrow text-primary ${className ?? ""}`}>{children}</p>;
}
