"use client";

import { useEffect, useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { digitsOnly } from "@/lib/forms";
import type { ApiErrorBody } from "@/lib/types";

/** A parent changes their own PIN. Other devices are signed out; this one gets a fresh session. */
export function ChangePinSheet({ open, mobile, onClose }: { open: boolean; mobile?: string; onClose: () => void }) {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  }, [open]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6,12}$/.test(current)) return setError("Enter your current PIN");
    if (!/^\d{6,12}$/.test(next)) return setError("Your new PIN is 6 to 12 digits");
    if (next !== confirm) return setError("The two new PINs don't match");
    if (next === current) return setError("Choose a PIN different from the current one");
    setBusy(true);
    try {
      const res = await fetch("/api/family-auth/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, currentPin: current, newPin: next }),
      });
      if (!res.ok) {
        setError(((await res.json()) as ApiErrorBody).message);
        return;
      }
      toast({ title: "PIN changed", description: "Use your new PIN next time you sign in." });
      onClose();
    } catch {
      setError("Can't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const pinInput = (id: string, label: string, value: string, set: (v: string) => void, autoComplete: string) => (
    <Field id={id} label={label}>
      <Input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete={autoComplete}
        maxLength={12}
        value={value}
        onChange={(e) => set(digitsOnly(e.target.value, 12))}
        invalid={Boolean(error)}
      />
    </Field>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Change PIN"
      description="6 to 12 digits. Avoid easy ones like 111111 or 123456."
      footer={
        <Button type="submit" form="family-pin-form" size="lg" className="w-full" loading={busy} icon={<KeyRound className="h-5 w-5" aria-hidden />}>
          Save PIN
        </Button>
      }
    >
      <form id="family-pin-form" noValidate onSubmit={save} className="space-y-5">
        {pinInput("family-current-pin", "Current PIN", current, setCurrent, "current-password")}
        {pinInput("family-next-pin", "New PIN", next, setNext, "new-password")}
        {pinInput("family-confirm-next-pin", "Type the new PIN again", confirm, setConfirm, "new-password")}
        {error && (
          <p role="alert" className="rounded-xl bg-alert-50 px-4 py-3 text-sm font-medium text-alert-700">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}
