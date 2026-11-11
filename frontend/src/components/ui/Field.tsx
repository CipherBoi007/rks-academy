import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export const fieldLabel = "text-xs font-semibold uppercase tracking-[0.08em] text-ink/80";

const control =
  "w-full rounded-xl border border-line bg-white text-[15px] text-ink placeholder:text-muted " +
  "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-surface aria-[invalid=true]:border-alert";

/** Label + control + hint/error, wired with ids for screen readers. */
export function Field({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-alert-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = ComponentProps<"input"> & { icon?: ReactNode; invalid?: boolean; prefix?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { icon, invalid, prefix, className, id, ...rest },
  ref,
) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden>
          {icon}
        </span>
      )}
      {prefix && (
        <span className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 text-[15px] text-ink" aria-hidden>
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={cn(control, "h-12 px-3.5", icon && "pl-10", prefix && "pl-[4.25rem]", className)}
        {...rest}
      />
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select"> & { invalid?: boolean }>(function Select(
  { invalid, className, children, id, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={cn(control, "h-12 appearance-none pl-3.5 pr-10", className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea"> & { invalid?: boolean }>(
  function Textarea({ invalid, className, id, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={cn(control, "min-h-[88px] px-3.5 py-3", className)}
        {...rest}
      />
    );
  },
);
