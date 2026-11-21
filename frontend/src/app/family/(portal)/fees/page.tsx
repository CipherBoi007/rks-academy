"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleCheck, CircleX, Clock, Receipt, Wallet } from "lucide-react";
import { PaySheet } from "@/components/family/PaySheet";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { useFamilyFees, type FamilyFees } from "@/lib/family";
import { formatDate, formatPeriod, inr } from "@/lib/format";
import { useConfig } from "@/lib/queries";
import type { PaymentReport } from "@/lib/types";

const receiptHref = (no: string) => `/family/receipts/${no.split("/").slice(1).join("/")}`;

/** Fees for the whole family: what is due, Pay now (UPI), payment reports and every receipt. */
export default function FamilyFeesPage() {
  const fees = useFamilyFees();
  const { data: config } = useConfig();
  const [paying, setPaying] = useState(false);

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="font-display text-[32px] font-bold uppercase leading-none sm:text-[40px] lg:text-5xl">Fees</h1>
      </div>

      {fees.isError ? (
        <Card>
          <ErrorState error={fees.error} onRetry={() => fees.refetch()} />
        </Card>
      ) : !fees.data ? (
        <LoadingRegion label="Loading fees">
          <div className="space-y-5">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </LoadingRegion>
      ) : fees.data.children.length === 0 ? (
        <Card>
          <EmptyState title="No players found" message="Contact the academy if this looks wrong." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start lg:gap-8">
          <div className="space-y-4">
            <DueCard fees={fees.data} onPay={() => setPaying(true)} />
            {fees.data.reports.map((r) => (
              <ReportNotice key={r.id} report={r} canReportAgain={fees.data.toReport > 0} onReportAgain={() => setPaying(true)} />
            ))}
          </div>
          <History fees={fees.data} />
        </div>
      )}

      {fees.data && config && (
        <PaySheet open={paying} fees={fees.data} today={config.today} onClose={() => setPaying(false)} />
      )}
    </div>
  );
}

function DueCard({ fees, onPay }: { fees: FamilyFees; onPay: () => void }) {
  if (fees.totalDue <= 0) {
    return (
      <Card className="flex items-center gap-4 border-primary/20 bg-primary-50 p-5">
        <CircleCheck className="h-8 w-8 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="font-display text-xl font-bold uppercase text-primary-700">All paid up</p>
          <p className="text-[15px] text-primary-700">There are no fees due right now. Thank you!</p>
        </div>
      </Card>
    );
  }
  const due = fees.children.filter((c) => c.due);
  return (
    <div className="overflow-hidden rounded-2xl bg-navy text-white">
      <div className="px-5 pb-4 pt-5 sm:px-6">
        <p className="text-[11px] font-bold uppercase tracking-eyebrow text-white/70">Amount due</p>
        <p className="mt-1 font-display text-5xl font-bold">{inr(fees.totalDue)}</p>
      </div>
      <ul className="divide-y divide-white/10 border-y border-white/10">
        {due.map(({ player, due: q, payBy, reported }) => (
          <li key={player.id} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="truncate font-semibold">{player.name}</p>
              <p className="text-sm text-white/70">
                {formatPeriod(q!.periodFrom, q!.periodTo)} · {q!.plan.name}
                {q!.lateFee > 0 ? ` · incl. ${inr(q!.lateFee)} late fee` : payBy ? ` · pay by ${formatDate(payBy)}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-xl font-bold">{inr(q!.total)}</p>
              {reported && <p className="text-[11px] font-bold uppercase tracking-wide text-accent">Reported</p>}
            </div>
          </li>
        ))}
      </ul>
      <div className="px-5 py-4 sm:px-6">
        {fees.toReport > 0 ? (
          <Button size="lg" onClick={onPay} className="w-full" icon={<Wallet className="h-5 w-5" aria-hidden />}>
            Pay {inr(fees.toReport)}
          </Button>
        ) : (
          <p className="flex items-center gap-2 text-[15px] text-white/85">
            <Clock className="h-5 w-5 shrink-0 text-accent" aria-hidden /> Payment reported. The academy will confirm it soon.
          </p>
        )}
      </div>
    </div>
  );
}

function ReportNotice({ report: r, canReportAgain, onReportAgain }: { report: PaymentReport; canReportAgain: boolean; onReportAgain: () => void }) {
  const ref = `ref ••••${r.utr}`;
  const tone = {
    PENDING: { icon: Clock, box: "border-line bg-white", iconClass: "text-primary" },
    CONFIRMED: { icon: CircleCheck, box: "border-primary/20 bg-primary-50", iconClass: "text-primary" },
    REJECTED: { icon: CircleX, box: "border-alert/40 bg-alert-50", iconClass: "text-alert-700" },
  }[r.status];
  const Icon = tone.icon;
  return (
    <div role="status" className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3.5", tone.box)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", tone.iconClass)} aria-hidden />
      <div className="min-w-0 flex-1 text-[15px]">
        {r.status === "PENDING" && (
          <p>
            <strong>{inr(r.amount)}</strong> paid on {formatDate(r.paidOn)} ({ref}) is reported. The academy will confirm it soon.
          </p>
        )}
        {r.status === "CONFIRMED" && (
          <p className="text-primary-700">
            <strong>{inr(r.amount)}</strong> ({ref}) is confirmed. Your receipt is in Payments below.
          </p>
        )}
        {r.status === "REJECTED" && (
          <>
            <p className="text-alert-700">
              <strong>{inr(r.amount)}</strong> ({ref}) couldn&apos;t be confirmed: {r.rejectReason}
            </p>
            {canReportAgain && (
              <button type="button" onClick={onReportAgain} className="mt-1 min-h-11 font-semibold text-alert-700 underline underline-offset-2">
                Report again
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function History({ fees }: { fees: FamilyFees }) {
  const several = fees.children.length > 1;
  return (
    <Card className="p-5 sm:p-6">
      <CardTitle>Payments</CardTitle>
      {fees.payments.length === 0 ? (
        <EmptyState icon={<Receipt className="h-6 w-6" aria-hidden />} title="No payments yet" message="Your receipts will appear here." />
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {fees.payments.map((p) => (
            <li key={p.id}>
              <Link href={receiptHref(p.receiptNo)} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-surface">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {several && `${p.player.name} · `}
                    {formatPeriod(p.periodFrom, p.periodTo)}
                  </p>
                  <p className="text-sm text-muted">
                    {formatDate(p.paidOn)} · {p.mode === "UPI" ? "UPI" : "Cash"} · {p.receiptNo}
                  </p>
                </div>
                <p className="shrink-0 font-display text-lg font-bold">{inr(p.amount)}</p>
                <Receipt className="h-5 w-5 shrink-0 text-primary" aria-label="View receipt" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
