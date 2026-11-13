"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCanSeeFees } from "@/lib/queries";
import { Logo } from "./Logo";
import { NAV, isActive } from "./nav";
import { useSignOut } from "./useSignOut";

/**
 * Hidden on phones. Icon-only from md up to xl (below 1280px the full sidebar would squeeze the content). Full
 * width from xl up, where Collapse switches it to icon-only. `collapsed` only matters at xl and up.
 */
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const canSeeFees = useCanSeeFees();
  const signOut = useSignOut();
  const items = NAV.filter((n) => canSeeFees || !n.ownerOnly);
  // Labels render only at xl+ when expanded.
  const label = cn("truncate", collapsed ? "hidden" : "hidden xl:inline");

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-white md:flex md:w-[76px]",
        !collapsed && "xl:w-64",
      )}
      aria-label="Main"
    >
      {/* Blue, continuing the top bar across the full width. */}
      <div className={cn("relative flex h-20 items-center border-b border-primary bg-primary px-4", !collapsed && "xl:px-5")}>
        {/* Covers the sidebar's right border here so the blue band has no seam. */}
        <span className="absolute inset-y-0 -right-px w-px bg-primary" aria-hidden />
        <Logo compact onBrand className={cn(!collapsed && "xl:hidden")} />
        {!collapsed && <Logo onBrand className="hidden xl:flex" />}
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-12 items-center gap-3 rounded-xl px-3.5 text-base font-medium transition-colors",
                !collapsed && "xl:px-4",
                active ? "bg-primary text-white" : "text-ink/80 hover:bg-surface hover:text-ink",
              )}
            >
              {active && <span className="absolute -left-1 top-2 bottom-2 w-1 rounded-full bg-accent" aria-hidden />}
              <Icon className={cn("h-5 w-5 shrink-0", active && "text-accent")} aria-hidden />
              <span className={label}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-line px-3 py-4">
        <button
          type="button"
          onClick={signOut}
          title="Sign out"
          aria-label="Sign out"
          className="flex h-12 w-full items-center gap-3 rounded-xl px-3.5 text-base font-medium text-ink/80 hover:bg-surface"
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden />
          <span className={label}>Sign out</span>
        </button>
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden h-12 w-full items-center gap-3 rounded-xl px-3.5 text-base font-medium text-ink/80 hover:bg-surface xl:flex"
        >
          {collapsed ? (
            <ChevronsRight className="h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <ChevronsLeft className="h-5 w-5 shrink-0" aria-hidden />
          )}
          <span className={label}>Collapse</span>
        </button>
      </div>
    </aside>
  );
}
