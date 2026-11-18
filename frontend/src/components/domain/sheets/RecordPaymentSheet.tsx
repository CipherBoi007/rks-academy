"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Banknote, CircleCheck, Smartphone } from "lucide-react";
import { PlayerPicker } from "@/components/domain/PlayerPicker";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ChoiceGroup } from "@/components/ui/Controls";
import { Field, Input, Textarea, fieldLabel } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import { formatPeriod, inr, planPeriodLabel } from "@/lib/format";
import { keys, useAllPlayers, useConfig, usePlans } from "@/lib/queries";
import type { Payment, PaymentMode, Quote } from "@/lib/types";

/** Receipt numbers look like RKS/26/1126; the receipt page lives at /receipts/26/1126. */
export function receiptHref(receiptNo: string) {
  const [, yy, n] = receiptNo.split("/");
  return `/receipts/${yy}/${n}`;
}

/**
 * Log a fee collection. The server quotes the amount (plan, sibling discount, late and registration fees),
 * and the desk may override it with a reason, which is stored as an adjustment.
 */
export function RecordPaymentSheet({
  open,
  onClose,
  playerId: initialPlayer,
}: {
  open: boolean;
  onClose: () => void;
  playerId?: number;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: config } = useConfig();
  const players = useAllPlayers(open && initialPlayer === undefined);
  const plans = usePlans();
  const today = config?.today ?? "";

  const [playerId, setPlayerId] = useState<number | null>(initialPlayer ?? null);
  const [paidOn, setPaidOn] = useState(today);
  const [mode, setMode] = useState<PaymentMode>("UPI");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlayerId(initialPlayer ?? null);
    setPaidOn(today);
    setMode("UPI");
    setAmount("");
    setNote("");
    setSubmitted(false);
  }, [open, initialPlayer, today]);

  const quote = useQuery({
    queryKey: ["quote", playerId, paidOn],
    queryFn: () => api<Quote>("/payments/quote", { method: "POST", body: { playerId, paidOn } }),
    enabled: open && playerId !== null && Boolean(paidOn),
    staleTime: 0,
  });

  // Prefill the amount with the quote whenever the player or date changes.
  useEffect(() => {
    if (quote.data) setAmount(String(quote.data.total));
  }, [quote.data]);

  const plan = plans.data?.find((p) => p.id === quote.data?.plan.id);
  const parsedAmount = Number(amount);
  const amountValid = amount !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const overridden = quote.data !== undefined && amountValid && parsedAmount !== quote.data.total;
  const reasonMissing = overridden && note.trim() === "";

  const save = useMutation({
    mutationFn: () =>
      api<Payment>("/payments", {
        method: "POST",
        body: {
          playerId,
          mode,
          paidOn,
          amount: overridden ? parsedAmount : undefined,
          note: note.trim() || undefined,
        },
      }),
    onSuccess: (payment) => {
      for (const key of [keys.payments, keys.dues, keys.summary, keys.players, keys.reminders, ["quote"]]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      toast({
        title: `Payment recorded · ${inr(payment.amount)}`,
        description: `${payment.player.name} · Receipt ${payment.receiptNo}`,
        action: { label: "View receipt", href: receiptHref(payment.receiptNo), newTab: true },
      });
      onClose();
    },
    onError: (e) => toast({ tone: "error", title: "Couldn't record the payment", description: errorMessage(e) }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (playerId === null || !quote.data || !amountValid || reasonMissing) return;
    save.mutate();
  }

  const q = quote.data;
  const breakdown = q
    ? [
        q.siblingDiscount > 0 && { label: `Sibling discount (${q.siblingDiscountPct}%)`, value: -q.siblingDiscount },
        q.lateFee > 0 && { label: "Late fee", value: q.lateFee },
        q.registrationFee > 0 && { label: "Registration fee", value: q.registrationFee },
      ].filter((x): x is { label: string; value: number } => Boolean(x))
    : [];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Record payment"
      description="Log a fee collection and generate a receipt."
      footer={
        <Button
          type="submit"
          form="payment-form"
          size="lg"
          className="w-full"
          loading={save.isPending}
          disabled={quote.isFetching}
          icon={<CircleCheck className="h-5 w-5" aria-hidden />}
        >
          Save &amp; generate receipt
        </Button>
      }
    >
      <form id="payment-form" noValidate onSubmit={submit} className="space-y-5">
        {initialPlayer !== undefined ? (
          // Opened for one player (their profile, or a due row): show who, rather than a picker to change it.
          <div className="space-y-1.5">
            <p className={fieldLabel}>Player</p>
            {quote.data ? (
              <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5">
                <Avatar name={quote.data.player.name} initials={quote.data.player.initials} photoUrl={quote.data.player.photoUrl} size="sm" />
                <p className="min-w-0 truncate font-semibold">
                  {quote.data.player.name} <span className="font-normal text-muted">· {quote.data.player.code}</span>
                </p>
              </div>
            ) : (
              !quote.isError && <Skeleton className="h-[54px] rounded-xl" />
            )}
          </div>
        ) : (
          <Field id="pay-player" label="Player" error={submitted && playerId === null ? "Pick a player" : undefined}>
            <PlayerPicker
              id="pay-player"
              players={players.data ?? []}
              value={playerId}
              onChange={setPlayerId}
              invalid={submitted && playerId === null}
            />
          </Field>
        )}

        {playerId !== null &&
          (quote.isError ? (
            <p role="alert" className="rounded-xl bg-alert-50 px-4 py-3 text-sm font-medium text-alert-700">
              {errorMessage(quote.error)}
            </p>
          ) : !q ? (
            <Skeleton className="h-[72px]" />
          ) : (
            <div className="rounded-xl bg-surface px-4 py-3">
              <p className="font-semibold">
                {q.plan.name} plan{plan?.price != null && ` · ${inr(plan.price)} ${planPeriodLabel(plan.periodMonths)}`}
              </p>
              {q.periodFrom > today ? (
                <p className="text-sm text-muted">No dues · this pays ahead for {formatPeriod(q.periodFrom, q.periodTo)}</p>
              ) : (
                <p className="text-sm font-medium text-alert-700">
                  Due {inr(q.total)} for {formatPeriod(q.periodFrom, q.periodTo)}
                </p>
              )}
              {breakdown.length > 0 && (
                <dl className="mt-2 space-y-1 border-t border-line pt-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Plan</dt>
                    <dd>{inr(q.planAmount)}</dd>
                  </div>
                  {breakdown.map((b) => (
                    <div key={b.label} className="flex justify-between">
                      <dt className="text-muted">{b.label}</dt>
                      <dd>{b.value < 0 ? `− ${inr(-b.value)}` : inr(b.value)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold">
                    <dt>Total</dt>
                    <dd>{inr(q.total)}</dd>
                  </div>
                </dl>
              )}
            </div>
          ))}

        <Field
          id="pay-amount"
          label="Amount (₹)"
          error={submitted && !amountValid ? "Enter the amount collected" : undefined}
          hint={overridden && q ? `Differs from the computed ${inr(q.total)}; the difference is saved as an adjustment.` : undefined}
        >
          <Input
            id="pay-amount"
            type="number"
            inputMode="decimal"
            min={1}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            invalid={submitted && !amountValid}
            className="font-semibold"
          />
        </Field>

        {overridden && (
          <Field id="pay-note" label="Reason for the change" error={submitted && reasonMissing ? "Add a reason" : undefined}>
            <Textarea
              id="pay-note"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Late fee waived by the owner"
              invalid={submitted && reasonMissing}
            />
          </Field>
        )}

        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/80">Mode</p>
          <ChoiceGroup<PaymentMode>
            label="Payment mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "CASH", label: "Cash", icon: <Banknote className="h-5 w-5" aria-hidden /> },
              { value: "UPI", label: "UPI", icon: <Smartphone className="h-5 w-5" aria-hidden /> },
            ]}
          />
        </div>

        <Field id="pay-date" label="Date">
          <Input id="pay-date" type="date" max={today} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </Field>
      </form>
    </Sheet>
  );
}
