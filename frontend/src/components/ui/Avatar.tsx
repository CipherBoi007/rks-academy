/* eslint-disable @next/next/no-img-element -- photos come from the authenticated API proxy, not next/image */
import { cn } from "@/lib/cn";

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-14 w-14 text-lg",
  "2xl": "h-24 w-24 text-3xl",
} as const;

/** A photo when there is one; otherwise yellow Oswald initials on a blue circle. */
export function Avatar({
  name,
  initials,
  photoUrl,
  size = "md",
  className,
}: {
  name: string;
  initials: string;
  photoUrl?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const classes = cn("shrink-0 rounded-full", sizes[size], className);
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className={cn(classes, "object-cover")} />;
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(classes, "inline-flex items-center justify-center bg-primary font-display font-bold text-accent")}
    >
      {initials}
    </span>
  );
}
