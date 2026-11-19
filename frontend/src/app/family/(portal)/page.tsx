"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight, CalendarDays, ChevronDown, CircleCheck, Clock, MapPin, MessageCircle, ShoppingBag, TriangleAlert, Users } from "lucide-react";
import { ProductAd } from "@/components/domain/ProductAd";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LevelChip, StatusChip } from "@/components/ui/Chip";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { useFamily, type FamilyChild } from "@/lib/family";
import { formatDate, formatMobile, formatPeriod, formatTimeRange, inr } from "@/lib/format";
import { useConfig } from "@/lib/queries";

const DAY_SHORT: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};

/** Family home: one column on phones; on desktop the children sit beside a sticky help-and-shop panel. */
export default function FamilyHomePage() {
  const family = useFamily();
  const { data: config } = useConfig();
  const children = family.data?.children ?? [];

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-eyebrow text-primary">
            {family.data ? `${children.length === 1 ? "1 child" : `${children.length} children`} at RKS` : " "}
          </p>
          <h1 className="mt-1 font-display text-[32px] font-bold uppercase leading-none sm:text-[40px] lg:text-5xl">
            Vanakkam{family.data?.parentName ? `, ${family.data.parentName}` : ""}
          </h1>
        </div>
        {children.length > 0 && <FamilySummary items={children} />}
      </div>

      <ProductAd variant="hero" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
        <section aria-label="Your children" className="min-w-0">
          {family.isError ? (
            <Card>
              <ErrorState error={family.error} onRetry={() => family.refetch()} />
            </Card>
          ) : !family.data ? (
            <LoadingRegion label="Loading your children">
              <Skeleton className="h-72 rounded-2xl" />
            </LoadingRegion>
          ) : children.length === 0 ? (
            <Card>
              <EmptyState icon={<Users className="h-6 w-6" aria-hidden />} title="No players found" message="Contact the academy if this looks wrong." />
            </Card>
          ) : (
            <ul className="grid grid-cols-1 gap-5 min-[1760px]:grid-cols-2">
              {children.map((child) => (
                <ChildCard key={child.id} child={child} />
              ))}
            </ul>
          )}
        </section>

        <aside aria-label="Help and shop" className="space-y-5 lg:sticky lg:top-24">
          {config && (
            <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch">
              <div>
                <p className="font-semibold">Questions about fees or batches?</p>
                <p className="text-sm text-muted">
                  Message the academy on WhatsApp: <span className="select-all font-medium text-ink">{formatMobile(config.whatsappNumber)}</span>
                </p>
              </div>
              <a
                href={`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent("Vanakkam! I have a question about my child at RKS Academy.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({ variant: "secondary" })}
              >
                <MessageCircle className="h-5 w-5 text-primary" aria-hidden /> Message the academy
              </a>
            </Card>
          )}
          <Card className="hidden p-5 lg:block">
            <p className="text-xs font-bold uppercase tracking-eyebrow text-primary">RKS Pro Shop</p>
            <p className="mt-1 font-display text-xl font-bold uppercase leading-tight">Gear at academy prices</p>
            <p className="mt-1 text-sm text-muted">Rackets, shuttles and shoes our coaches recommend.</p>
            <Link href="/family/shop" className={cn(buttonClass({ variant: "secondary" }), "mt-4 w-full")}>
              <ShoppingBag className="h-5 w-5 text-primary" aria-hidden /> Browse the shop
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}

/** Three quick numbers for the whole family. */
function FamilySummary({ items }: { items: FamilyChild[] }) {
  const dueTotal = items.reduce((sum, c) => sum + (c.due ? Number(c.due.amount) : 0), 0);
  const avgAttendance = Math.round(items.reduce((sum, c) => sum + c.attendancePct, 0) / items.length);
  const tiles = [
    { label: items.length === 1 ? "Player" : "Players", value: String(items.length), tone: "text-ink" },
    { label: "Fees", value: dueTotal > 0 ? `${inr(dueTotal)} due` : "Paid up", tone: dueTotal > 0 ? "text-alert-700" : "text-primary" },
    { label: "Attendance", value: `${avgAttendance}%`, tone: "text-primary" },
  ];
  return (
    <dl className="grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-white lg:min-w-[460px]">
      {tiles.map((t) => (
        <div key={t.label} className="min-w-0 px-3 py-3 sm:px-5">
          <dt className="text-[11px] font-bold uppercase tracking-eyebrow text-muted">{t.label}</dt>
          <dd className={cn("mt-0.5 truncate font-display text-lg font-bold sm:text-2xl", t.tone)}>{t.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ChildCard({ child }: { child: FamilyChild }) {
  const days = child.days.map((d) => DAY_SHORT[d] ?? d).join(", ");
  const href = `/family/child/${child.id}`;
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  return (
    <li>
      <Card className="flex h-full flex-col overflow-hidden">
        <div className="flex items-center gap-4 border-b border-line bg-surface/60 p-4 sm:p-5">
          <Avatar name={child.name} initials={child.initials} photoUrl={child.photoUrl} size="xl" />
          <div className="min-w-0 flex-1">
            {/* In the two-up layout (very wide screens) the chip moves under the name so long names stay on one line. */}
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold uppercase leading-tight">{child.name}</h2>
              <span className="min-[1760px]:hidden">
                <StatusChip status={child.feeStatus} />
              </span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              {child.code} · {child.age} yrs <LevelChip level={child.level} />
              <span className="hidden min-[1760px]:inline-flex">
                <StatusChip status={child.feeStatus} />
              </span>
            </p>
          </div>
          <Link
            href={href}
            aria-label={`View progress, attendance and receipts for ${child.name}`}
            className={cn(buttonClass(), "hidden shrink-0 md:inline-flex")}
          >
            View progress <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>

        <div className="grid flex-1 grid-cols-1 content-start gap-4 p-4 sm:grid-cols-2 sm:p-5 md:gap-5">
          <div className="rounded-xl bg-primary px-4 py-3.5 text-white sm:col-span-2 md:col-span-1">
            <p className="text-[11px] font-bold uppercase tracking-eyebrow text-white/70">Batch</p>
            <p className="mt-1 font-display text-xl font-bold uppercase leading-tight">{child.batchName}</p>
            <p className="mt-1 flex items-center gap-1.5 font-semibold text-accent">
              <Clock className="h-4 w-4" aria-hidden /> {formatTimeRange(child.startTime, child.endTime)}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
              <CalendarDays className="h-4 w-4" aria-hidden /> {days}
            </p>
          </div>

          {/* Phones show just the batch until the card is opened; from md up the details always sit in the grid. */}
          <div id={detailsId} className={cn(open ? "grid" : "hidden", "grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2 md:contents")}>
            <div className="flex flex-col justify-between gap-3">
              <p className="flex items-center gap-2 text-[15px]">
                <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden /> {child.courtName} · Coach {child.coachName}
              </p>
              <div>
                <div className="flex justify-between text-[15px]">
                  <span className="font-semibold">Attendance</span>
                  <span className="font-display text-lg font-bold text-primary">{child.attendancePct}%</span>
                </div>
                <div
                  role="meter"
                  aria-label="Attendance over the last 14 weeks"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={child.attendancePct}
                  className="mt-1.5 h-2 rounded-full bg-surface"
                >
                  <div className="h-full rounded-full bg-primary" style={{ width: `${child.attendancePct}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted">Last 14 weeks</p>
              </div>
            </div>

            <FeeBox child={child} />

            <Link href={href} className={cn(buttonClass({ size: "lg" }), "w-full sm:col-span-2 md:hidden")}>
              Progress, attendance &amp; receipts <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>

          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((o) => !o)}
            className="-mb-1 flex min-h-11 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-primary hover:bg-surface sm:col-span-2 md:hidden"
          >
            {open ? "Hide details" : "Show attendance & fees"}
            <ChevronDown className={cn("h-5 w-5 motion-safe:transition-transform", open && "rotate-180")} aria-hidden />
          </button>
        </div>
      </Card>
    </li>
  );
}

function FeeBox({ child }: { child: FamilyChild }) {
  if (!child.due) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-primary-50 px-4 py-3 text-[15px] font-medium text-primary-700 sm:col-span-2">
        <CircleCheck className="h-5 w-5 shrink-0" aria-hidden /> Fees are paid up. Thank you!
      </p>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-alert/40 bg-alert-50 px-4 py-3 sm:col-span-2">
      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-alert-700" aria-hidden />
      <div className="min-w-0 flex-1 text-[15px] text-alert-700">
        <p>
          <strong className="font-display text-xl">{inr(child.due.amount)}</strong> due for{" "}
          {formatPeriod(child.due.periodFrom, child.due.periodTo)}
        </p>
        <p className="text-sm">Pay by {formatDate(child.due.payBy)} to avoid a late fee.</p>
      </div>
      <Link href="/family/fees" className={cn(buttonClass({ variant: "secondary" }), "shrink-0 self-center px-3")}>
        Pay now
      </Link>
    </div>
  );
}
