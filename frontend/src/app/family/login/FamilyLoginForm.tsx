"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, KeyRound, Lock, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { digitsOnly, mobileDigits } from "@/lib/forms";
import type { ApiErrorBody } from "@/lib/types";

/** Only same-site family paths are allowed as a post-login destination. */
function safeNext(next: string | null) {
  return next && next.startsWith("/family") && !next.startsWith("//") ? next : "/family";
}

/**
 * Mobile number and PIN. The first sign-in uses the one-time PIN from the academy, and then a second step asks
 * the parent to choose their own PIN before the portal opens.
 * `intro` shows under the first step only, so the PIN step stays focused (and fits small phones).
 */
export function FamilyLoginForm({ intro }: { intro?: ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<"signin" | "newPin">("signin");
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const newPinInput = useRef<HTMLInputElement>(null);

  /** Posts to the family sign-in route; returns whether a new PIN must be chosen, or null on error. */
  async function post(path: string, body: object): Promise<boolean | null> {
    setBusy(true);
    try {
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) {
        setError((json as ApiErrorBody).message);
        return null;
      }
      return Boolean(json.mustChangePin);
    } catch {
      setError("Can't reach the server. Check your connection.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  function enter() {
    router.replace(safeNext(params.get("next")));
    router.refresh();
  }

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{10}$/.test(mobile)) return setError("Enter your 10-digit mobile number");
    if (!/^\d{6,12}$/.test(pin)) return setError("Enter your PIN (6 to 12 digits)");
    const mustChange = await post("/api/family-auth/login", { mobile, pin });
    if (mustChange === null) return;
    if (!mustChange) return enter();
    setStep("newPin");
    setTimeout(() => newPinInput.current?.focus(), 0);
  }

  async function saveNewPin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6,12}$/.test(newPin)) return setError("Your new PIN is 6 to 12 digits");
    if (newPin !== confirm) return setError("The two PINs don't match");
    if (newPin === pin) return setError("Choose a PIN different from the one the academy gave you");
    if ((await post("/api/family-auth/set-pin", { mobile, currentPin: pin, newPin })) !== null) enter();
  }

  const errorBox = error && (
    <p role="alert" className="rounded-xl bg-alert-50 px-4 py-3 text-sm font-medium text-alert-700">
      {error}
    </p>
  );

  if (step === "signin") {
    return (
      <>
        <form onSubmit={signIn} noValidate className="mt-5 space-y-4 short:mt-3 short:space-y-3 tall:mt-8 tall:space-y-5 md:mt-8 md:space-y-5">
          <Field id="family-mobile" label="Mobile number">
            <Input
              id="family-mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="username"
              placeholder="00000 00000"
              prefix="+91"
              icon={<Phone className="h-5 w-5" />}
              value={mobile}
              onChange={(e) => setMobile(mobileDigits(e.target.value))}
              invalid={Boolean(error)}
            />
          </Field>
          <Field id="family-pin" label="PIN">
            <Input
              id="family-pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={12}
              placeholder="••••••"
              icon={<Lock className="h-5 w-5" />}
              value={pin}
              onChange={(e) => setPin(digitsOnly(e.target.value, 12))}
              invalid={Boolean(error)}
            />
          </Field>
          {errorBox}
          <Button type="submit" size="lg" className="w-full" loading={busy} trailingIcon={<ArrowRight className="h-5 w-5" />}>
            Sign in
          </Button>
          <p className="text-center text-sm text-muted">New here or forgot your PIN? Ask the academy for a one-time PIN.</p>
        </form>
        {intro}
      </>
    );
  }

  return (
    // data-step lets the sign-in frame drop the crest on this step, so it fits one phone screen.
    <form data-step="code" onSubmit={saveNewPin} noValidate className="mt-5 space-y-4 short:mt-3 short:space-y-3 tall:mt-6 md:mt-8 md:space-y-5">
      <p className="text-center text-sm text-ink/80">
        Welcome! Choose your own PIN of 6 to 12 digits. You&apos;ll use it to sign in from now on.
      </p>
      <Field id="family-new-pin" label="New PIN">
        <Input
          ref={newPinInput}
          id="family-new-pin"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={12}
          icon={<KeyRound className="h-5 w-5" />}
          value={newPin}
          onChange={(e) => setNewPin(digitsOnly(e.target.value, 12))}
          invalid={Boolean(error)}
        />
      </Field>
      <Field id="family-confirm-pin" label="Type it again">
        <Input
          id="family-confirm-pin"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={12}
          icon={<KeyRound className="h-5 w-5" />}
          value={confirm}
          onChange={(e) => setConfirm(digitsOnly(e.target.value, 12))}
          invalid={Boolean(error)}
        />
      </Field>
      {errorBox}
      <Button type="submit" size="lg" className="w-full" loading={busy} trailingIcon={<ArrowRight className="h-5 w-5" />}>
        Save PIN and continue
      </Button>
    </form>
  );
}
