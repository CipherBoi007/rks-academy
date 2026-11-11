import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/dashboard" className={cn("flex min-w-0 items-center gap-3", className)} aria-label="RKS Academy home">
      <Image src="/brand/crest.png" alt="" width={48} height={48} className="h-11 w-11 shrink-0" priority />
      {!compact && (
        <span className="min-w-0">
          <span className="block font-display text-[22px] font-bold uppercase leading-none text-primary">RKS Academy</span>
          <span className="mt-1 block whitespace-nowrap text-[11px] text-ink/70">Ramanathapuram, Tamil Nadu</span>
        </span>
      )}
    </Link>
  );
}
