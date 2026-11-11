"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatPeriod, inr } from "@/lib/format";
import { keys } from "@/lib/queries";
import type { Payment } from "@/lib/types";

/**
 * Voids a wrong payment. It stays on record with its receipt marked VOID but stops counting, so the period
 * becomes due again and can be recorded correctly.
 */
export function VoidPaymentSheet({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setReason("");
    setSubmitted(false);
  }, [payment]);

  const valid = reason.trim().length >= 3;
  const voidIt = useMutation({
    mutationFn: () => api<Payment>(`/payments/${payment!.id}/void`, { method: "POST", body: { reason: reason.trim() } }),
    onSuccess: (p) => {
      for (const key of [keys.payments, keys.dues, keys.summary, keys.players, keys.reminders, ["quote"], ["receipt"]]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      toast({ title: `Receipt ${p.receiptNo} voided`, description: `${p.player.name}'s ${formatPeriod(p.periodFrom, p.periodTo)} fee is due again.` });
      onClose();
    },
    onError: (e) => toast({ tone: "error", title: "Couldn't void the payment", description: errorMessage(e) }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (valid) voidIt.mutate();
  }

  return (
    <Sheet
      open={payment !== null}
      onClose={onClose}
      title="Void payment"
      description={payment ? `${payment.receiptNo} · ${payment.player.name}` : undefined}
      footer={
        <Button
          type="submit"
          form="void-form"
          variant="danger"
          size="lg"
          className="w-full"
          loading={voidIt.isPending}
          icon={<Ban className="h-5 w-5" aria-hidden />}
        >
          Void this payment
        </Button>
      }
    >
      {payment && (
        <form id="void-form" noValidate onSubmit={submit} className="space-y-5">
          <dl className="space-y-1 rounded-xl bg-surface px-4 py-3 text-[15px]">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Amount</dt>
              <dd className="font-semibold">{inr(payment.amount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Paid on</dt>
              <dd>{formatDate(payment.paidOn)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">For</dt>
              <dd>
                {payment.plan.name} · {formatPeriod(payment.periodFrom, payment.periodTo)}
              </dd>
            </div>
          </dl>
          <p className="text-[15px] text-muted">
            The payment stays on record with its receipt marked VOID, but no longer counts. The period becomes due
            again, so record the correct payment afterwards. This can&apos;t be undone.
          </p>
          <Field id="void-reason" label="Reason" error={submitted && !valid ? "Say why, in a few words" : undefined}>
            <Textarea
              id="void-reason"
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Recorded against the wrong player"
              invalid={submitted && !valid}
            />
          </Field>
        </form>
      )}
    </Sheet>
  );
}
