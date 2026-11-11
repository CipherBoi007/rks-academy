"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, KeyRound, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { api, errorMessage } from "@/lib/api";
import type { CodeRequested } from "@/lib/family";
import { formatMobile } from "@/lib/format";
import type { ApiErrorBody } from "@/lib/types";

/** Only same-site family paths are allowed as a post-login destination. */
function safeNext(next: string | null) {
  return next && next.startsWith("/family") && !next.startsWith("//") ? next : "/family";
}

/**
 * Two steps: the parent's mobile number, then the 6-digit code that arrives on WhatsApp.
 * `intro` shows under the first step only, so the code step stays focused (and fits small phones).
 */
export function FamilyLoginForm({ intro }: { intro?: ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"mobile" | "code">("mobile");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<CodeRequested | null>(null);
  const [wait, setWait] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function requestCode(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!/^\d{10}$/.test(mobile)) {
      setError("Enter your 10-digit mobile number");
      return;
    }
    setBusy(true);
    try {
      const res = await api<CodeRequested>("/family/auth/request-code", { method: "POST", body: { mobile } });
      setSent(res);
      setWait(res.retryAfterSeconds);
      setStep("code");
      setCode("");
      setTimeout(() => codeInput.current?.focus(), 0);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("The code has 6 digits");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/family-auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, code }),
      });
      if (!res.ok) {
        setError(((await res.json()) as ApiErrorBody).message);
        return;
      }
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch {
      setError("Can't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const errorBox = error && (
    <p role="alert" className="rounded-xl bg-alert-50 px-4 py-3 text-sm font-medium text-alert-700">
      {error}
    </p>
  );

  if (step === "mobile") {
    return (
      <>
        <form onSubmit={requestCode} noValidate className="mt-5 space-y-4 short:mt-3 short:space-y-3 tall:mt-8 tall:space-y-5 md:mt-8 md:space-y-5">
          <Field id="family-mobile" label="Mobile number">
            <Input
              id="family-mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              placeholder="00000 00000"
              prefix="+91"
              icon={<Phone className="h-5 w-5" />}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              invalid={Boolean(error)}
            />
          </Field>
          {errorBox}
          <Button type="submit" size="lg" className="w-full" loading={busy} icon={<MessageCircle className="h-5 w-5" aria-hidden />}>
            Send code on WhatsApp
          </Button>
        </form>
        {intro}
      </>
    );
  }

  return (
    // data-step lets the sign-in frame drop the crest on this step, so it fits one phone screen.
    <form data-step="code" onSubmit={verify} noValidate className="mt-5 space-y-4 short:mt-3 short:space-y-3 tall:mt-6 md:mt-8 md:space-y-5">
      <p className="text-center text-sm text-ink/80">{sent?.message}</p>
      {sent?.devCode && (
        <p className="rounded-xl border border-dashed border-primary/40 bg-primary-50 px-4 py-3 text-sm text-primary-700">
          Development mode: WhatsApp isn&apos;t connected, so here is the code: <strong className="tracking-widest">{sent.devCode}</strong>
        </p>
      )}
      <Field id="family-code" label={`Code sent to ${formatMobile(mobile)}`}>
        <Input
          ref={codeInput}
          id="family-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          icon={<KeyRound className="h-5 w-5" />}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          invalid={Boolean(error)}
          className="text-lg tracking-[0.4em]"
        />
      </Field>
      {errorBox}
      <Button type="submit" size="lg" className="w-full" loading={busy} trailingIcon={<ArrowRight className="h-5 w-5" />}>
        Sign in
      </Button>
      <div className="flex items-center justify-between gap-3 text-sm">
        <button
          type="button"
          onClick={() => {
            setStep("mobile");
            setError(null);
          }}
          className="min-h-11 font-semibold text-primary"
        >
          Use a different number
        </button>
        <button type="button" disabled={wait > 0 || busy} onClick={() => requestCode()} className="min-h-11 font-semibold text-primary disabled:text-muted">
          {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}
