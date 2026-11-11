"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useCanSeeFees } from "@/lib/queries";
import { NAV, isActive } from "./nav";

/** Phone tab bar: Home, Players, Attendance, Fees, Store (Fees hidden for coaches). */
export function BottomNav() {
  const pathname = usePathname();
  const canSeeFees = useCanSeeFees();
  const items = NAV.filter((n) => n.inTabBar && (canSeeFees || !n.ownerOnly));

  return (
    <nav
      aria-label="Main"
      className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-safe md:hidden"
    >
      <ul className="flex h-tabbar">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                  active ? "text-primary" : "text-muted",
                )}
              >
                {active && <span className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-accent" aria-hidden />}
                <Icon className="h-[22px] w-[22px]" aria-hidden />
                {item.tabLabel ?? item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
