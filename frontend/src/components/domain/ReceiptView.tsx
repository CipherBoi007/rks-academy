"use client";

import Image from "next/image";
import Link from "next/link";
import type { UseQueryResult } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingRegion, Skeleton } from "@/components/ui/States";
import { formatDate, formatPeriod, inr } from "@/lib/format";
import type { Receipt } from "@/lib/types";

/** A printable fee receipt, shared by the staff app and the family portal. Printing gives just the receipt. */
export function ReceiptView({
  receipt,
  backHref,
  backLabel,
}: {
  receipt: UseQueryResult<Receipt>;
  backHref: string;
  backLabel: string;
}) {
  const r = receipt.data;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 print:max-w-none print:p-0">
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <Link href={backHref} className="inline-flex min-h-11 items-center gap-2 font-medium text-primary">
          <ArrowLeft className="h-5 w-5" aria-hidden /> {backLabel}
        </Link>
        <Button icon={<Printer className="h-5 w-5" aria-hidden />} onClick={() => window.print()} disabled={!r}>
          Print
        </Button>
      </div>

      {receipt.isError ? (
        <ErrorState error={receipt.error} onRetry={() => receipt.refetch()} />
      ) : !r ? (
        <LoadingRegion label="Loading receipt">
          <Skeleton className="h-[640px] rounded-2xl" />
        </LoadingRegion>
      ) : (
        <article className="relative overflow-hidden rounded-2xl border border-line bg-white p-6 sm:p-10 print:rounded-none print:border-0">
          {r.voided && (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 flex -rotate-[20deg] items-center justify-center font-display text-[120px] font-bold uppercase text-alert/15 sm:text-[180px]"
              >
                Void
              </div>
              <p role="alert" className="relative mb-6 rounded-xl border border-alert/40 bg-alert-50 px-4 py-3 text-[15px] text-alert-700">
                <strong>This receipt is void.</strong> {r.voidReason}
                {r.voidedAt && ` (voided ${formatDate(r.voidedAt)})`}
              </p>
            </>
          )}
          <header className="flex items-start justify-between gap-4 border-b border-line pb-6">
            <div className="flex items-center gap-4">
              <Image src="/brand/crest.png" alt="" width={72} height={72} className="h-16 w-16 sm:h-[72px] sm:w-[72px]" />
              <div>
                <h1 className="font-display text-xl font-bold uppercase leading-tight sm:text-2xl">{r.academyName}</h1>
                <p className="text-sm text-muted">{r.academyAddress}</p>
                <p className="text-sm text-muted">{r.academyPhone}</p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-bold uppercase tracking-eyebrow text-primary">Fee receipt</p>
              <p className="mt-1 font-display text-lg font-bold">{r.receiptNo}</p>
              <p className="text-sm text-muted">{formatDate(r.issuedOn)}</p>
            </div>
          </header>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 py-6 text-[15px]">
            <div>
              <dt className="text-sm text-muted">Player</dt>
              <dd className="font-semibold">
                {r.playerName} <span className="font-normal text-muted">({r.playerCode})</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Received from</dt>
              <dd className="font-semibold">{r.receivedFrom}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Batch</dt>
              <dd className="font-semibold">{r.batchName}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Period</dt>
              <dd className="font-semibold">
                {formatPeriod(r.periodFrom, r.periodTo)}{" "}
                <span className="font-normal text-muted">
                  ({formatDate(r.periodFrom)} – {formatDate(r.periodTo)})
                </span>
              </dd>
            </div>
          </dl>

          <table className="w-full text-[15px]">
            <thead>
              <tr className="border-y border-line text-left text-sm text-muted">
                <th scope="col" className="py-2 font-medium">Description</th>
                <th scope="col" className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {r.lines.map((line) => (
                <tr key={line.label} className="border-b border-line">
                  <td className="py-3">{line.label}</td>
                  <td className="py-3 text-right">{line.amount < 0 ? `− ${inr(-line.amount)}` : inr(line.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="pt-4 text-left font-display text-lg uppercase">Total paid</th>
                <td className="pt-4 text-right font-display text-2xl font-bold text-primary">{inr(r.total)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-2 text-sm text-muted">{r.totalInWords}</p>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-6 border-t border-line pt-6 text-[15px]">
            <div>
              <p>
                Paid by <strong>{r.mode === "UPI" ? "UPI" : "Cash"}</strong>
              </p>
              {r.note && <p className="mt-1 text-sm text-muted">Note: {r.note}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted">Received by</p>
              <p className="font-semibold">{r.recordedBy ?? "RKS Academy"}</p>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-muted">This is a computer-generated receipt. Thank you for training with RKS Academy.</p>
        </article>
      )}
    </main>
  );
}
