"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Check, ChevronDown, CircleX, TriangleAlert } from "lucide-react";
import { receiptHref } from "@/components/domain/sheets/RecordPaymentSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatMobile, formatMonth, inr } from "@/lib/format";
import { keys, usePaymentReports } from "@/lib/queries";
import type { PaymentReport } from "@/lib/types";

/** Everything a decision changes: the receipts, dues, totals and the players' fee status. */
const AFFECTED = [keys.paymentReports, keys.payments, keys.dues, keys.summary, keys.players, keys.reminders, ["quote"]];

/**
 * The Fees page's Requests tab: UPI payments families reported from the family app. The owner checks each
 * reference in the bank app, then confirms (receipts are issued, dated the day of payment) or rejects with
 * a reason the family sees. Decided requests stay listed for 30 days.
 */
export function PaymentReportsPanel() {
  const reports = usePaymentReports();
  const [showDecided, setShowDecided] = useState(false);
  const [rejecting, setRejecting] = useState<PaymentReport | null>(null);

  if (reports.isError) {
    return (
      <Card className="p-4">
        <ErrorState error={reports.error} onRetry={() => reports.refetch()} />
      </Card>
    );
  }
  if (!reports.data) return <Skeleton className="h-28 rounded-2xl" />;
  if (reports.data.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No payment requests"
          message="When a family pays by UPI in the family app and reports it, it appears here for you to confirm."
        />
      </Card>
    );
  }
  const waiting = reports.data.filter((r) => r.status === "PENDING");
  const decided = reports.data.filter((r) => r.status !== "PENDING");

  return (
    <Card className={cn("p-4", waiting.length > 0 && "border-primary/40")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">
            Payment requests{waiting.length > 0 && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-white">{waiting.length} to check</span>}
          </p>
          <p className="text-sm text-muted">
            {waiting.length > 0
              ? "Find each reference in your bank or UPI app, then confirm it to issue the receipts."
              : "Nothing waiting right now."}
          </p>
        </div>
        {decided.length > 0 && (
          <Button
            variant="ghost"
            aria-expanded={showDecided}
            trailingIcon={<ChevronDown className={cn("h-4 w-4 transition-transform", showDecided && "rotate-180")} aria-hidden />}
            onClick={() => setShowDecided((s) => !s)}
            className="shrink-0 self-start sm:self-auto"
          >
            Last 30 days ({decided.length})
          </Button>
        )}
      </div>
      {(waiting.length > 0 || showDecided) && (
        <ul className="mt-4 divide-y divide-line border-t border-line">
          {waiting.map((r) => (
            <ReportRow key={r.id} report={r} onReject={() => setRejecting(r)} />
          ))}
          {showDecided && decided.map((r) => <ReportRow key={r.id} report={r} />)}
        </ul>
      )}
      <RejectSheet report={rejecting} onClose={() => setRejecting(null)} />
    </Card>
  );
}

function ReportRow({ report: r, onReject }: { report: PaymentReport; onReject?: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const confirm = useMutation({
    mutationFn: () => api<PaymentReport>(`/payment-reports/${r.id}/confirm`, { method: "POST" }),
    onSuccess: (done) => {
      for (const key of AFFECTED) queryClient.invalidateQueries({ queryKey: key });
      const receipts = done.items.map((i) => i.receiptNo).filter(Boolean);
      toast({
        title: `Payment confirmed · ${inr(done.amount)}`,
        description: `${receipts.length === 1 ? "Receipt" : "Receipts"} ${receipts.join(", ")}`,
        action: receipts[0] ? { label: "View receipt", href: receiptHref(receipts[0]), newTab: true } : undefined,
      });
    },
    onError: (e) => toast({ tone: "error", title: "Couldn't confirm the payment", description: errorMessage(e) }),
  });
  const mismatch = r.amount !== r.feesTotal;

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-semibold">
          {inr(r.amount)} <span className="font-normal text-muted">· UPI ref</span>{" "}
          <span className="select-all font-mono tracking-wide">{r.utr}</span>
        </p>
        <p className="text-sm text-muted">
          {r.holderName ?? "Family"}
          {r.holderMobile && ` · ${formatMobile(r.holderMobile)}`} · paid {formatDate(r.paidOn)}
        </p>
        <ul className="text-sm">
          {r.items.map((i) => (
            <li key={i.player.id}>
              {i.player.name} <span className="text-muted">({i.player.code})</span> · {formatMonth(i.periodFrom)} · {inr(i.amount)}
              {i.receiptNo && (
                <>
                  {" · "}
                  <Link href={receiptHref(i.receiptNo)} target="_blank" className="font-medium text-primary hover:underline">
                    {i.receiptNo}
                  </Link>
                </>
              )}
            </li>
          ))}
        </ul>
        {r.status === "PENDING" && mismatch && (
          <p className="flex items-start gap-1.5 text-sm font-medium text-alert-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            The fees come to {inr(r.feesTotal)}. Confirming records {inr(r.amount)}; the difference goes on the last receipt as an adjustment.
          </p>
        )}
        {r.status === "REJECTED" && <p className="text-sm text-alert-700">Rejected: {r.rejectReason}</p>}
      </div>
      {r.status === "PENDING" ? (
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" className="px-3" icon={<CircleX className="h-4 w-4" aria-hidden />} onClick={onReject} disabled={confirm.isPending}>
            Reject
          </Button>
          <Button className="px-3" icon={<Check className="h-4 w-4" aria-hidden />} loading={confirm.isPending} onClick={() => confirm.mutate()}>
            Confirm
          </Button>
        </div>
      ) : (
        <span
          className={cn(
            "shrink-0 self-start rounded-full px-2.5 py-1 text-xs font-semibold",
            r.status === "CONFIRMED" ? "bg-primary-50 text-primary" : "bg-alert-50 text-alert-700",
          )}
        >
          {r.status === "CONFIRMED" ? "Confirmed" : "Rejected"}
        </span>
      )}
    </li>
  );
}

function RejectSheet({ report, onClose }: { report: PaymentReport | null; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setReason("");
    setSubmitted(false);
  }, [report]);

  const valid = reason.trim().length >= 3;
  const reject = useMutation({
    mutationFn: () => api<PaymentReport>(`/payment-reports/${report!.id}/reject`, { method: "POST", body: { reason: reason.trim() } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.paymentReports });
      toast({ title: "Payment report rejected", description: "They see your reason in the family app and can report it again." });
      onClose();
    },
    onError: (e) => toast({ tone: "error", title: "Couldn't reject the report", description: errorMessage(e) }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (valid) reject.mutate();
  }

  return (
    <Sheet
      open={report !== null}
      onClose={onClose}
      title="Reject payment"
      description={report ? `${inr(report.amount)} · UPI ref ${report.utr}` : undefined}
      footer={
        <Button type="submit" form="reject-report-form" variant="danger" size="lg" className="w-full" loading={reject.isPending} icon={<CircleX className="h-5 w-5" aria-hidden />}>
          Reject
        </Button>
      }
    >
      <form id="reject-report-form" noValidate onSubmit={submit} className="space-y-5">
        <p className="text-[15px] text-muted">
          Nothing is recorded and the fees stay due. They see this reason in the family app and can report the payment
          again.
        </p>
        <Field id="reject-reason" label="Reason (shown in the family app)" error={submitted && !valid ? "Say why, in a few words" : undefined}>
          <Textarea
            id="reject-reason"
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. We can't find this reference in our bank statement"
            invalid={submitted && !valid}
          />
        </Field>
      </form>
    </Sheet>
  );
}
