import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { LevelChip, StatusChip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { formatDate, inr } from "@/lib/format";
import type { Due, Payment, PlayerSummary } from "@/lib/types";

export function PlayerCard({ player }: { player: PlayerSummary }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="flex items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-card transition-shadow hover:shadow-hard-primary"
    >
      <Avatar name={player.name} initials={player.initials} photoUrl={player.photoUrl} size="xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-base font-semibold">{player.name}</p>
          <StatusChip status={player.feeStatus} />
        </div>
        <p className="text-sm text-muted">
          {player.code} · {player.age} yrs
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <LevelChip level={player.level} />
          <span className="text-[13px] text-muted">
            {player.batch.name} · {player.court.name}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <li className="flex items-center gap-3 py-3.5">
      <Avatar name={payment.player.name} initials={payment.player.initials} photoUrl={payment.player.photoUrl} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{payment.player.name}</p>
        <p className="truncate text-sm text-muted">
          {formatDate(payment.paidOn)} · {payment.mode === "UPI" ? "UPI" : "Cash"} · {payment.plan.name}
        </p>
      </div>
      <p className="font-display text-xl font-bold text-primary">{inr(payment.amount)}</p>
    </li>
  );
}

export function DueRow({ due, action, className }: { due: Due; action?: React.ReactNode; className?: string }) {
  return (
    <li className={cn("relative flex items-center gap-3 overflow-hidden rounded-xl border border-line bg-white py-3 pl-5 pr-3", className)}>
      <span className="absolute inset-y-3 left-2 w-[3px] rounded-full bg-alert" aria-hidden />
      <div className="min-w-0 flex-1">
        <Link href={`/players/${due.player.id}`} className="block truncate font-semibold hover:underline">
          {due.player.name}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{due.batchName}</span>
          <LevelChip level={due.player.level} />
        </div>
      </div>
      <div className="text-right">
        <p className="font-display text-lg font-bold text-alert">{inr(due.amount)}</p>
        <p className="text-sm text-alert-700">
          {due.daysOverdue} {due.daysOverdue === 1 ? "day" : "days"}
        </p>
      </div>
      {action}
    </li>
  );
}
