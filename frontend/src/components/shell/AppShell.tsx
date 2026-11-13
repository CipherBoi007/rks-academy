"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const STORAGE_KEY = "rks:sidebar-collapsed";

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  // A per-device convenience only, so storage failures (private mode) are ignored.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  }

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-semibold"
      >
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className={cn("md:pl-[76px]", !collapsed && "xl:pl-64")}>
        <TopBar />
        <main id="main" className="mx-auto max-w-content px-4 pb-28 pt-5 sm:pt-6 md:px-8 md:pb-12 md:pt-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
