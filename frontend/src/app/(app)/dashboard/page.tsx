"use client";

import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock, IndianRupee, MapPin, TriangleAlert, Users, Wallet } from "lucide-react";
import { DueRow, PaymentRow } from "@/components/domain/PlayerRows";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { SlotChip } from "@/components/ui/Chip";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { formatLongDate, formatMonth, formatTimeRange, inr } from "@/lib/format";
import { useCanSeeFees, useDashboardSummary, useDues, useMe, useRecentPayments, useTodayCourts } from "@/lib/queries";
import type { CourtDay } from "@/lib/types";

export default function DashboardPage() {
  const canSeeFees = useCanSeeFees();
  const { data: me } = useMe();
  const summary = useDashboardSummary();
  const s = summary.data;

  return (
    <>
      <p className="mb-4 text-base text-muted md:hidden">
        Vanakkam, <span className="text-lg font-bold text-primary">{me?.displayName}</span>
      </p>
      <PageHeader
        eyebrow={s ? formatLongDate(s.date) : " "}
        title="Academy overview"
        actions={
          <ButtonLink href="/attendance" icon={<CalendarCheck className="h-5 w-5" aria-hidden />} className="w-full sm:w-auto">
            Take attendance
          </ButtonLink>
        }
      />

      {summary.isError ? (
        <Card className="mb-6">
          <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
        </Card>
      ) : (
        <div className={cn("grid grid-cols-2 gap-3 sm:gap-4", canSeeFees && "lg:grid-cols-4")}>
          <KpiCard
            label="Active players"
            icon={<Users className="h-5 w-5" />}
            loading={!s}
            value={s?.activePlayers}
            meta={s && `+${s.newThisMonth} this month`}
          />
          <KpiCard
            label="Today's attendance"
            icon={<CalendarCheck className="h-5 w-5" />}
            loading={!s}
            value={s && (s.markedToday ? `${s.attendancePct}%` : "—")}
            meta={s && (s.markedToday ? `${s.presentToday} of ${s.markedToday} checked in` : "Not marked yet")}
          />
          {canSeeFees && (
            <>
              <KpiCard
                label="Fees collected"
                icon={<Wallet className="h-5 w-5" />}
                loading={!s}
                value={s?.collectedThisMonth != null && inr(s.collectedThisMonth)}
                meta={s && `${formatMonth(s.date)} · ${s.paymentsThisMonth} payments`}
              />
              <KpiCard
                label="Pending dues"
                tone="alert"
                icon={<IndianRupee className="h-5 w-5" />}
                loading={!s}
                value={s?.pendingDues != null && inr(s.pendingDues)}
                meta={s && `${s.duePlayers} players`}
              />
            </>
          )}
        </div>
      )}

      <TodayOnCourt />

      {canSeeFees && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <DuesAlert className="lg:order-2 lg:col-span-2" />
          <RecentPayments className="lg:order-1 lg:col-span-3" />
        </div>
      )}
    </>
  );
}

function TodayOnCourt() {
  const courts = useTodayCourts();
  // Phones: no outer card, so the court cards sit directly on the page instead of spilling over a card's edges.
  return (
    <section className="mt-6 md:rounded-2xl md:border md:border-line md:bg-white md:p-6 md:shadow-card">
      <CardTitle
        action={
          <span className="inline-flex items-center gap-2 text-sm font-medium text-ink/80">
            <span className="h-2 w-2 rounded-full bg-alert" aria-hidden /> Live status
          </span>
        }
      >
        Today on court
      </CardTitle>
      {courts.isError ? (
        <ErrorState error={courts.error} onRetry={() => courts.refetch()} />
      ) : !courts.data ? (
        <LoadingRegion label="Loading courts">
          <div className="mt-5 flex gap-4 overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 min-w-[85%] sm:min-w-[45%] lg:min-w-0 lg:flex-1" />
            ))}
          </div>
        </LoadingRegion>
      ) : (
        // Phones: a horizontal snap scroller with a peek of the next court.
        <div className="scrollbar-none relative -mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 md:-mx-6 md:mt-5 md:scroll-px-0 md:gap-4 md:px-6 md:pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 xl:grid-cols-4">
          {courts.data.map((c) => (
            <CourtCard key={c.court.id} day={c} />
          ))}
        </div>
      )}
    </section>
  );
}

function CourtCard({ day }: { day: CourtDay }) {
  // Every court shows two slots; empty ones are open for booking.
  const placeholders = Math.max(0, 2 - day.slots.length);
  return (
    <section
      aria-label={day.court.name}
      className="min-w-[85%] snap-start rounded-2xl border border-line bg-white p-3.5 shadow-card sm:min-w-[45%] md:bg-surface md:shadow-none lg:min-w-0"
    >
      <header className="mb-3 flex items-center justify-between gap-2 px-1">
        <h3 className="whitespace-nowrap font-display text-2xl font-semibold uppercase">{day.court.name}</h3>
        <span className="inline-flex min-w-0 items-center gap-1 text-right text-xs text-ink/70">
          <MapPin className="h-3.5 w-3.5" aria-hidden /> {day.court.surfaceType}
        </span>
      </header>
      <ul className="space-y-3">
        {day.slots.map((slot) => (
          <li key={slot.batchId} className="rounded-xl border border-line bg-surface/60 p-3.5 md:bg-white">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-primary">
                <Clock className="h-4 w-4" aria-hidden />
                {formatTimeRange(slot.startTime, slot.endTime)}
              </span>
              <SlotChip status={slot.status} />
            </div>
            <p className="mt-1.5 font-semibold">{slot.batchName}</p>
            <p className="text-sm text-muted">
              Coach {slot.coachName} · {slot.playerCount} players
            </p>
          </li>
        ))}
        {Array.from({ length: placeholders }, (_, i) => (
          <li key={`open-${i}`} className="rounded-xl border border-dashed border-line bg-white/60 p-3.5 text-center text-sm text-muted">
            Open for court booking
          </li>
        ))}
      </ul>
    </section>
  );
}

function RecentPayments({ className }: { className?: string }) {
  const payments = useRecentPayments(true);
  return (
    <Card className={cn("p-4 sm:p-6", className)}>
      <CardTitle
        action={
          <Link href="/fees" className="inline-flex min-h-11 items-center gap-1 font-semibold text-primary">
            View all <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        }
      >
        Recent payments
      </CardTitle>
      {payments.isError ? (
        <ErrorState error={payments.error} onRetry={() => payments.refetch()} />
      ) : !payments.data ? (
        <LoadingRegion label="Loading payments">
          <div className="mt-3 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </LoadingRegion>
      ) : payments.data.content.length === 0 ? (
        <EmptyState title="No payments yet" message="Recorded fees will appear here." />
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {payments.data.content.map((p) => (
            <PaymentRow key={p.id} payment={p} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function DuesAlert({ className }: { className?: string }) {
  const dues = useDues();
  const count = dues.data?.totalElements ?? 0;
  return (
    <Card className={cn("p-4 sm:p-6", className)}>
      <CardTitle
        action={
          count > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-alert-50 px-3 py-1.5 text-sm font-semibold text-alert-700">
              <TriangleAlert className="h-4 w-4" aria-hidden /> {count} due
            </span>
          )
        }
      >
        Dues alert
      </CardTitle>
      {dues.isError ? (
        <ErrorState error={dues.error} onRetry={() => dues.refetch()} />
      ) : !dues.data ? (
        <LoadingRegion label="Loading dues">
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </LoadingRegion>
      ) : count === 0 ? (
        <EmptyState title="All paid up" message="No player has an unpaid fee period." />
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {dues.data.content.slice(0, 5).map((d) => (
              <DueRow key={d.player.id} due={d} />
            ))}
          </ul>
          {count > 5 && (
            <Link href="/fees?tab=pending" className="mt-4 inline-flex min-h-11 items-center gap-1 font-semibold text-primary">
              See all {count} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </>
      )}
    </Card>
  );
}
