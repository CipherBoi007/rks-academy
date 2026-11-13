"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Home, KeyRound, LogOut, ShoppingBag, type LucideIcon } from "lucide-react";
import { ChangePinSheet } from "@/components/family/ChangePinSheet";
import { cn } from "@/lib/cn";
import { useFamily } from "@/lib/family";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/family", label: "Home", icon: Home },
  { href: "/family/shop", label: "Shop", icon: ShoppingBag },
];

function isActive(pathname: string, href: string) {
  return href === "/family" ? pathname === "/family" || pathname.startsWith("/family/child") : pathname.startsWith(href);
}

/** The parents' app frame: a light header, a phone tab bar (Home, Shop) and a comfortable reading width. */
export function FamilyShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: family } = useFamily();
  const [changingPin, setChangingPin] = useState(false);

  async function signOut() {
    await fetch("/api/family-auth/logout", { method: "POST" }).catch(() => undefined);
    queryClient.clear();
    window.location.assign("/family/login");
  }

  return (
    <div className="min-h-dvh">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-4 md:h-[72px] md:px-8 xl:px-12">
          <div className="flex min-w-0 items-center gap-10">
            <Link href="/family" className="flex min-w-0 items-center gap-3" aria-label="RKS Academy family home">
              <Image src="/brand/crest.png" alt="" width={44} height={44} className="h-10 w-10 shrink-0" priority />
              <span className="min-w-0">
                <span className="block font-display text-xl font-bold uppercase leading-none text-primary">RKS Academy</span>
                <span className="block text-[11px] font-semibold uppercase tracking-eyebrow text-ink/60">Family</span>
              </span>
            </Link>
            <nav aria-label="Family" className="hidden items-center gap-1 md:flex">
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive(pathname, href) ? "page" : undefined}
                  className={cn(
                    "inline-flex h-11 items-center rounded-xl px-4 font-semibold",
                    isActive(pathname, href) ? "bg-primary text-white" : "text-ink/80 hover:bg-surface",
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setChangingPin(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-semibold text-ink/80 hover:bg-surface"
            >
              <KeyRound className="h-5 w-5" aria-hidden />
              <span className="hidden sm:inline">Change PIN</span>
              <span className="sr-only sm:hidden">Change PIN</span>
            </button>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-semibold text-ink/80 hover:bg-surface"
            >
              <LogOut className="h-5 w-5" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
              <span className="sr-only sm:hidden">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <ChangePinSheet open={changingPin} mobile={family?.mobile} onClose={() => setChangingPin(false)} />

      <main id="main" className="mx-auto max-w-[1600px] px-4 pb-28 pt-5 md:px-8 xl:px-12 md:pb-14 md:pt-10">
        {children}
      </main>

      <nav aria-label="Family" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-safe md:hidden">
        <ul className="flex h-tabbar">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                    active ? "text-primary" : "text-muted",
                  )}
                >
                  {active && <span className="absolute inset-x-10 top-0 h-[3px] rounded-b-full bg-accent" aria-hidden />}
                  <Icon className="h-[22px] w-[22px]" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
