import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** onBrand: white text, for the blue phone top bar. */
export function Logo({ compact, onBrand, className }: { compact?: boolean; onBrand?: boolean; className?: string }) {
  return (
    <Link href="/dashboard" className={cn("flex min-w-0 items-center gap-3", className)} aria-label="RKS Academy home">
      <Image src="/brand/crest.png" alt="" width={48} height={48} className="h-11 w-11 shrink-0" priority />
      {!compact && (
        <span className="min-w-0">
          <span className={cn("block font-display text-[22px] font-bold uppercase leading-none", onBrand ? "text-white" : "text-primary")}>
            RKS Academy
          </span>
          <span className={cn("mt-1 block whitespace-nowrap text-[11px]", onBrand ? "text-white/80" : "text-ink/70")}>
            Ramanathapuram, Tamil Nadu
          </span>
        </span>
      )}
    </Link>
  );
}
