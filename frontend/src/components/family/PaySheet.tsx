"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Copy, Phone, Send, Smartphone } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field, Input } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { familyKeys, type FamilyFees } from "@/lib/family";
import { inr } from "@/lib/format";
import { colors } from "@/lib/theme";
import type { PaymentReport } from "@/lib/types";

/** The standard UPI payment link that GPay, PhonePe, Paytm and bank apps all open. */
function upiLink(upiId: string, payee: string, amount: number, note: string) {
  const params = new URLSearchParams({ pa: upiId, pn: payee, am: amount.toFixed(2), cu: "INR", tn: note.slice(0, 50) });
  return `upi://pay?${params.toString()}`;
}

/**
 * Pay the academy by UPI, then report it with the UPI reference so the academy can match it to the bank and
 * issue the receipts. The money goes from the parent's UPI app straight to the academy; this app never touches it.
 */
export function PaySheet({ open, fees, today, onClose }: { open: boolean; fees: FamilyFees; today: string; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const unpaid = fees.children.filter((c) => c.due && !c.reported);
  const { upiId, payee, phone } = fees.payTo;
  const link = upiId ? upiLink(upiId, payee, fees.toReport, `RKS fees ${unpaid.map((c) => c.player.code).join(" ")}`) : null;

  const [utr, setUtr] = useState("");
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [errors, setErrors] = useState<{ utr?: string; amount?: string; paidOn?: string }>({});

  useEffect(() => {
    if (!open) return;
    setUtr("");
    setAmount(String(fees.toReport));
    setPaidOn(today);
    setErrors({});
  }, [open, fees.toReport, today]);

  const report = useMutation({
    mutationFn: () =>
      api<PaymentReport>("/family/payment-reports", {
        method: "POST",
        body: { utr, amount: Number(amount), paidOn },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: familyKeys.fees });
      toast({ title: "Thank you! Payment reported", description: "The academy will confirm it and your receipt will appear here." });
      onClose();
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === "UTR_INVALID") return setErrors({ utr: e.message });
      if (e instanceof ApiError && e.code.startsWith("PAID_ON")) return setErrors({ paidOn: e.message });
      if (e instanceof ApiError && e.code === "UTR_ALREADY_REPORTED") return setErrors({ utr: e.message });
      toast({ tone: "error", title: "Couldn't report the payment", description: errorMessage(e) });
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^[A-Za-z0-9]{10,22}$/.test(utr.replace(/[\s-]/g, ""))) next.utr = "Enter the UPI reference number (usually 12 digits)";
    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) next.amount = "Enter the amount you paid";
    if (!paidOn) next.paidOn = "Pick the day you paid";
    setErrors(next);
    if (Object.keys(next).length === 0) report.mutate();
  }

  const differs = amount !== "" && Number(amount) > 0 && Number(amount) !== fees.toReport;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Pay fees"
      description={upiId ? "Pay by UPI, then report it below." : undefined}
      footer={
        upiId ? (
          <Button type="submit" form="pay-report-form" size="lg" className="w-full" loading={report.isPending} icon={<Send className="h-5 w-5" aria-hidden />}>
            Report payment
          </Button>
        ) : undefined
      }
    >
      <div className="rounded-2xl bg-primary px-5 py-4 text-white">
        <p className="text-[11px] font-bold uppercase tracking-eyebrow text-white/70">Amount to pay</p>
        <p className="mt-1 font-display text-4xl font-bold">{inr(fees.toReport)}</p>
        <ul className="mt-2 space-y-0.5 text-sm text-white/85">
          {unpaid.map((c) => (
            <li key={c.player.id} className="flex justify-between gap-3">
              <span className="truncate">{c.player.name}</span>
              <span className="shrink-0 font-semibold">{inr(c.due!.total)}</span>
            </li>
          ))}
        </ul>
      </div>

      {upiId && link ? (
        <>
          <a href={link} className={cn(buttonClass({ size: "lg" }), "mt-5 w-full md:hidden")}>
            <Smartphone className="h-5 w-5" aria-hidden /> Pay {inr(fees.toReport)} with a UPI app
          </a>
          <UpiQr link={link} />
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">UPI ID · {payee}</p>
              <p className="select-all truncate font-semibold">{upiId}</p>
            </div>
            <Button
              variant="ghost"
              className="shrink-0 px-3"
              icon={<Copy className="h-4 w-4" aria-hidden />}
              onClick={() =>
                navigator.clipboard
                  ?.writeText(upiId)
                  .then(() => toast({ title: "UPI ID copied" }))
                  .catch(() => undefined)
              }
            >
              Copy
            </Button>
          </div>

          <form id="pay-report-form" noValidate onSubmit={submit} className="mt-6 space-y-5 border-t border-line pt-5">
            <div>
              <p className="font-semibold">Paid? Report it here</p>
              <p className="text-sm text-muted">
                The academy matches it with the bank, then your receipt appears on this page. Find the reference under
                the payment details in your UPI app.
              </p>
            </div>
            <Field id="pay-utr" label="UPI reference (UTR) number" error={errors.utr}>
              <Input
                id="pay-utr"
                inputMode="numeric"
                autoComplete="off"
                maxLength={30}
                placeholder="e.g. 431234567890"
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                invalid={Boolean(errors.utr)}
              />
            </Field>
            <Field
              id="pay-amount"
              label="Amount paid"
              error={errors.amount}
              hint={differs ? `The fees come to ${inr(fees.toReport)}. If you paid a different amount, the academy will check it.` : undefined}
            >
              <Input
                id="pay-amount"
                inputMode="decimal"
                prefix="₹"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                invalid={Boolean(errors.amount)}
              />
            </Field>
            <Field id="pay-date" label="Paid on" error={errors.paidOn}>
              <DatePicker id="pay-date" label="Paid on" value={paidOn} max={today} onChange={setPaidOn} />
            </Field>
          </form>
        </>
      ) : (
        <div className="mt-5 space-y-4">
          <p className="text-[15px]">
            Online payment isn&apos;t set up yet. Please pay at the academy desk by UPI or cash; your receipt will appear here.
          </p>
          {phone && (
            <a href={`tel:${phone.replace(/\s/g, "")}`} className={cn(buttonClass({ variant: "secondary" }), "w-full")}>
              <Phone className="h-5 w-5 text-primary" aria-hidden /> Call the academy
            </a>
          )}
        </div>
      )}
    </Sheet>
  );
}

/** The same UPI link as a QR code, for paying from another phone. Drawn in the browser; the library loads on demand. */
function UpiQr({ link }: { link: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setSrc(null);
    import("qrcode")
      .then((qr) => qr.toDataURL(link, { width: 480, margin: 1, color: { dark: colors.navy.DEFAULT, light: "#ffffff" } }))
      .then((url) => live && setSrc(url))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [link]);
  return (
    <div className="mt-5 flex flex-col items-center gap-2 max-md:hidden">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- a generated data: URL
        <img src={src} alt="UPI QR code for the academy" width={220} height={220} className="h-[220px] w-[220px] rounded-xl border border-line p-2" />
      ) : (
        <Skeleton className="h-[220px] w-[220px] rounded-xl" />
      )}
      <p className="text-center text-sm text-muted">Scan with GPay, PhonePe, Paytm or any UPI app.</p>
    </div>
  );
}
