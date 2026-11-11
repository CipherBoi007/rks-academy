import Link from "next/link";
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "accent" | "ghost" | "danger";
type Size = "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[transform,box-shadow,background-color] " +
  "disabled:cursor-not-allowed disabled:opacity-60 select-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  // The signature hard offset shadow; pressing nudges the button into its shadow.
  primary:
    "bg-primary text-white shadow-hard hover:bg-primary-700 active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm",
  secondary: "border border-line bg-white text-ink hover:bg-surface",
  accent: "bg-accent text-ink hover:brightness-95",
  ghost: "text-primary hover:bg-primary-50",
  danger: "border border-alert/40 bg-white text-alert-700 hover:bg-alert-50",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-4 text-[15px]",
  lg: "h-12 px-5 text-base",
  icon: "h-11 w-11",
};

interface Common {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function buttonClass({ variant = "primary", size = "md" }: { variant?: Variant; size?: Size } = {}) {
  return cn(base, variants[variant], sizes[size]);
}

export const Button = forwardRef<HTMLButtonElement, ComponentProps<"button"> & Common & { loading?: boolean }>(
  function Button(
    { variant, size, icon, trailingIcon, loading, className, children, disabled, type = "button", ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonClass({ variant, size }), className)}
        {...rest}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
        {children}
        {trailingIcon}
      </button>
    );
  },
);

export function ButtonLink({
  variant,
  size,
  icon,
  trailingIcon,
  className,
  children,
  ...rest
}: ComponentProps<typeof Link> & Common) {
  return (
    <Link className={cn(buttonClass({ variant, size }), className)} {...rest}>
      {icon}
      {children}
      {trailingIcon}
    </Link>
  );
}
