"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Briefcase, Cake, CalendarDays, Droplet, GraduationCap, MapPin, Phone, User } from "lucide-react";
import { AttendanceMonth } from "@/components/domain/AttendanceMonth";
import { SkillProgress } from "@/components/domain/SkillProgress";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardTitle } from "@/components/ui/Card";
import { LevelChip, StatusChip } from "@/components/ui/Chip";
import { Pager, usePager } from "@/components/ui/Pager";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { formatDate, formatMobile, formatPeriod, formatTimeRange, GENDER_LABEL, inr } from "@/lib/format";
import type { Payment, PlayerAttendance, PlayerDetail, Progress, Quote } from "@/lib/types";

/** The player profile, shared by the staff app and the family portal; each passes its own data and links. */

export function ProfileHeader({ player, actions }: { player: PlayerDetail; actions?: ReactNode }) {
  return (
    <Card outlined className="overflow-hidden">
      <div className="stripes h-20 bg-primary sm:h-24" aria-hidden />
      <div className="flex flex-col gap-4 px-4 pb-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
          <Avatar
            name={player.name}
            initials={player.initials}
            photoUrl={player.photoUrl}
            size="2xl"
            className="-mt-12 ring-4 ring-white"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[30px] font-bold uppercase leading-none sm:text-4xl">{player.name}</h1>
              <StatusChip status={player.feeStatus} />
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-muted">
              <span className="font-semibold text-ink">{player.code}</span>· {player.age} yrs · {GENDER_LABEL[player.gender]} ·
              <LevelChip level={player.level} />
              {!player.active && <span className="font-semibold text-alert-700">· Inactive</span>}
            </p>
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </Card>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <li className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
      <span className="mt-0.5 text-primary" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-0.5 break-words text-base">{value || "—"}</p>
      </div>
    </li>
  );
}

export function ProfileInfoCards({ player, siblingHref }: { player: PlayerDetail; siblingHref: (id: number) => string }) {
  const icon = "h-[18px] w-[18px]";
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="p-5 sm:p-6">
        <CardTitle>Personal</CardTitle>
        <ul className="mt-5 divide-y divide-line">
          <InfoRow icon={<Cake className={icon} />} label="Date of birth" value={formatDate(player.dob)} />
          <InfoRow icon={<Droplet className={icon} />} label="Blood group" value={player.bloodGroup} />
          <InfoRow icon={<GraduationCap className={icon} />} label="School" value={player.school} />
          <InfoRow icon={<MapPin className={icon} />} label="Address" value={player.address} />
        </ul>
      </Card>
      <Card className="p-5 sm:p-6">
        <CardTitle>Parent</CardTitle>
        <ul className="mt-5 divide-y divide-line">
          <InfoRow icon={<User className={icon} />} label="Guardian" value={player.parent.name} />
          <InfoRow
            icon={<Phone className={icon} />}
            label="Phone"
            value={
              <a href={`tel:+91${player.parent.mobile}`} className="hover:underline">
                {formatMobile(player.parent.mobile)}
              </a>
            }
          />
          <InfoRow icon={<Briefcase className={icon} />} label="Occupation" value={player.parent.occupation} />
          <InfoRow icon={<CalendarDays className={icon} />} label="Joined RKS" value={formatDate(player.joinDate)} />
        </ul>
        {player.siblings.length > 0 && (
          <p className="mt-4 rounded-xl bg-surface px-3 py-2 text-sm text-muted">
            Sibling{player.siblings.length > 1 ? "s" : ""}:{" "}
            {player.siblings.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ", "}
                <Link href={siblingHref(s.id)} className="font-semibold text-primary hover:underline">
                  {s.name}
                </Link>
              </span>
            ))}
          </p>
        )}
      </Card>
      <Card className="p-5 sm:p-6 md:col-span-2 lg:col-span-1">
        <CardTitle>Training</CardTitle>
        <div className="mt-5 rounded-xl bg-primary px-4 py-3.5">
          <p className="text-[11px] font-bold uppercase tracking-eyebrow text-white/70">Batch</p>
          <p className="mt-1 font-display text-[22px] font-bold uppercase leading-tight text-white">{player.batch.name}</p>
          <p className="font-semibold text-accent">{formatTimeRange(player.batch.startTime, player.batch.endTime)}</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface px-4 py-3">
            <p className="text-sm text-muted">Court</p>
            <p className="text-lg font-semibold">{player.court.name}</p>
          </div>
          <div className="rounded-xl bg-surface px-4 py-3">
            <p className="text-sm text-muted">Plan</p>
            <p className="text-lg font-semibold">{player.plan.name}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-line px-4 py-3">
          <Avatar name={player.coach.name} initials={player.coach.initials} size="md" />
          <div>
            <p className="font-semibold">Coach {player.coach.name}</p>
            {player.coach.title && <p className="text-sm text-muted">{player.coach.title}</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Month-by-month attendance. useAttendance fetches one month (staff and family each have their own). */
export function AttendanceCard({
  playerId,
  joinDate,
  today,
  useAttendance,
  className,
}: {
  playerId: number;
  joinDate: string;
  today?: string;
  useAttendance: (id: number, month: string) => UseQueryResult<PlayerAttendance>;
  className?: string;
}) {
  return (
    <Card className={cn("p-5 sm:p-6", className)}>
      {today ? (
        <AttendanceMonth playerId={playerId} joinDate={joinDate} today={today} useAttendance={useAttendance} />
      ) : (
        <>
          <CardTitle>Attendance</CardTitle>
          <Skeleton className="mt-5 h-72" />
        </>
      )}
    </Card>
  );
}

export function SkillsCard({
  query,
  action,
  className,
}: {
  query: UseQueryResult<Progress>;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("p-5 sm:p-6", className)}>
      <CardTitle action={query.data && action}>Skill progress</CardTitle>
      <div className="mt-5">
        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : !query.data ? (
          <Skeleton className="h-64" />
        ) : (
          <SkillProgress progress={query.data} />
        )}
      </div>
    </Card>
  );
}

/** A current due first (hollow orange), then paid periods newest first, voided ones struck through. */
export function FeeTimeline({
  payments,
  due,
  receiptHref,
  receiptTarget,
}: {
  payments: UseQueryResult<Payment[]>;
  due?: Quote | null;
  receiptHref: (receiptNo: string) => string;
  receiptTarget?: "_blank";
}) {
  const listTop = useRef<HTMLOListElement>(null);
  const count = payments.data?.length ?? 0;
  const pager = usePager({ total: count, loaded: count, anchor: listTop });
  return (
    <Card className="mt-6 p-5 sm:p-6">
      <CardTitle>Fee history</CardTitle>
      {payments.isError ? (
        <ErrorState error={payments.error} onRetry={() => payments.refetch()} />
      ) : !payments.data ? (
        <div className="mt-5 space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : payments.data.length === 0 && !due ? (
        <EmptyState title="No payments yet" message="Fees paid at the academy will show here." />
      ) : (
        <>
          <ol
            ref={listTop}
            className="relative mt-5 scroll-mt-24 space-y-6 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-0.5 before:bg-line"
          >
          {due && (
            <li className={cn("relative flex gap-4 pl-8", pager.page > 0 && "hidden")}>
              <span className="absolute left-0 top-1 h-5 w-5 rounded-full border-[3px] border-alert bg-white" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold sm:text-lg">
                  {formatPeriod(due.periodFrom, due.periodTo)} · {due.plan.name}
                </p>
                <p className="text-sm font-medium text-alert-700">Due · not paid yet</p>
              </div>
              <p className="font-display text-xl font-bold text-alert">{inr(due.total)}</p>
            </li>
          )}
          {pager.slice(payments.data).map((p, i) => (
            <li key={p.id} className={cn("relative flex gap-4 pl-8", p.voided && "opacity-60")}>
              <span
                className={cn(
                  "absolute left-0 top-1 h-5 w-5 rounded-full border-[3px]",
                  p.voided ? "border-line bg-white" : i === 0 && !due ? "border-ink/70 bg-accent" : "border-primary bg-white",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold sm:text-lg">
                  {formatPeriod(p.periodFrom, p.periodTo)} · {p.plan.name}
                </p>
                <p className="text-sm text-muted">
                  {formatDate(p.paidOn)} · {p.mode === "UPI" ? "UPI" : "Cash"} · Receipt{" "}
                  <Link href={receiptHref(p.receiptNo)} target={receiptTarget} className="font-medium text-primary hover:underline">
                    {p.receiptNo}
                  </Link>
                </p>
              </div>
              {p.voided ? (
                <p className="text-right">
                  <s className="font-display text-xl font-bold text-muted">{inr(p.amount)}</s>
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-alert-700">Voided</span>
                </p>
              ) : (
                <p className="font-display text-xl font-bold text-primary">{inr(p.amount)}</p>
              )}
            </li>
          ))}
          </ol>
          <Pager pager={pager} label="Fee history" />
        </>
      )}
    </Card>
  );
}
