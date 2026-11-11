import type { ReactNode } from "react";

/** Blue letter-spaced eyebrow over a big black condensed title, with actions on the right. */
export function PageHeader({ eyebrow, title, actions }: { eyebrow: ReactNode; title: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-eyebrow text-primary">{eyebrow}</p>
        <h1 className="mt-1 font-display text-[34px] font-bold uppercase leading-none sm:text-[40px]">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={`text-[11px] font-bold uppercase tracking-eyebrow text-primary ${className ?? ""}`}>{children}</p>;
}
