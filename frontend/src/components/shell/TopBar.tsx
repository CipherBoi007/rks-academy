"use client";

import Link from "next/link";
import { BadgePercent, Bell, KeyRound, LogOut, Settings } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { inr } from "@/lib/format";
import { useCanSeeFees, useDues, useMe, useReminderStatus } from "@/lib/queries";
import { Logo } from "./Logo";
import { useSignOut } from "./useSignOut";

const menuItem = "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-ink hover:bg-surface";

/**
 * "Vanakkam, <name>" on tablet and desktop; logo on phones. A bell with an orange dot and the avatar menu.
 * A blue bar with white text; on md and up it lines up with the sidebar's blue logo block.
 */
export function TopBar() {
  const { data: me } = useMe();
  const canSeeFees = useCanSeeFees();
  const signOut = useSignOut();

  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-primary bg-primary px-4 md:h-20 md:px-8">
      <Logo onBrand className="md:hidden" />
      <div className="hidden min-w-0 md:block">
        <p className="text-sm text-white/80">Vanakkam,</p>
        <p className="truncate text-base font-semibold text-white">{me?.displayName ?? " "}</p>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <Notifications enabled={canSeeFees} />
        <Popover
          label="Account"
          trigger={({ open, toggle, id }) => (
            <button
              type="button"
              onClick={toggle}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={open ? id : undefined}
              aria-label="Account menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink bg-accent font-display text-base font-bold text-ink"
            >
              {me?.initials ?? ""}
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="border-b border-line px-3 pb-3 pt-2">
                <p className="font-semibold">{me?.displayName}</p>
                <p className="text-sm text-muted">{me?.role === "OWNER" ? "Owner" : "Coach"}</p>
              </div>
              <div className="pt-2">
                {canSeeFees && (
                  <>
                    <Link href="/fee-structure" role="menuitem" className={menuItem} onClick={close}>
                      <BadgePercent className="h-5 w-5 text-primary" aria-hidden /> Fee structure
                    </Link>
                    <Link href="/settings" role="menuitem" className={menuItem} onClick={close}>
                      <Settings className="h-5 w-5 text-primary" aria-hidden /> Settings
                    </Link>
                  </>
                )}
                <Link href="/change-pin" role="menuitem" className={menuItem} onClick={close}>
                  <KeyRound className="h-5 w-5 text-primary" aria-hidden /> Change PIN
                </Link>
                <button type="button" role="menuitem" className={menuItem} onClick={signOut}>
                  <LogOut className="h-5 w-5 text-primary" aria-hidden /> Sign out
                </button>
              </div>
            </>
          )}
        </Popover>
      </div>
    </header>
  );
}

/** For owners: outstanding dues and this month's WhatsApp reminders. Coaches have nothing fee-related here. */
function Notifications({ enabled }: { enabled: boolean }) {
  const dues = useDues(enabled);
  const reminders = useReminderStatus(enabled);
  const dueCount = dues.data?.totalElements ?? 0;
  const dueTotal = dues.data?.content.reduce((sum, d) => sum + d.amount, 0) ?? 0;
  const hasNews = enabled && dueCount > 0;

  return (
    <Popover
      label="Notifications"
      className="w-80"
      trigger={({ open, toggle, id }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          aria-label={hasNews ? `Notifications: ${dueCount} players with dues` : "Notifications"}
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/10"
        >
          <Bell className="h-6 w-6" aria-hidden />
          {hasNews && <span className="absolute right-2.5 top-2 h-2.5 w-2.5 rounded-full bg-alert ring-2 ring-primary" aria-hidden />}
        </button>
      )}
    >
      {(close) =>
        !enabled ? (
          <p className="px-3 py-4 text-[15px] text-muted">You&apos;re all caught up.</p>
        ) : (
          <div className="space-y-1">
            <Link href="/fees?tab=pending" role="menuitem" className={menuItem} onClick={close}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-alert" aria-hidden />
              <span>
                {dueCount === 0 ? "No pending dues" : `${dueCount} players have dues · ${inr(dueTotal)}`}
              </span>
            </Link>
            {reminders.data && (
              <p className="px-3 py-2 text-sm text-muted">
                WhatsApp reminders this month: {reminders.data.sent} sent
                {reminders.data.failed > 0 ? `, ${reminders.data.failed} failed` : ""}
              </p>
            )}
          </div>
        )
      }
    </Popover>
  );
}
