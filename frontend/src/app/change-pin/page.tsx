"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { PIN, cleaned } from "@/lib/forms";
import { keys } from "@/lib/queries";
import type { ApiErrorBody } from "@/lib/types";

// The current PIN may be an older 4-5 digit one; the new PIN must be 6 to 12 digits.
const schema = z
  .object({
    currentPin: z.string().regex(/^\d{4,12}$/, "Enter your current PIN"),
    newPin: z.string().regex(/^\d{6,12}$/, "PIN is 6 to 12 digits"),
    confirm: z.string(),
  })
  .refine((v) => v.newPin === v.confirm, { path: ["confirm"], message: "PINs don't match" })
  .refine((v) => v.newPin !== v.currentPin, { path: ["newPin"], message: "Choose a different PIN" });

type Values = z.infer<typeof schema>;

export default function ChangePinPage() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit({ currentPin, newPin }: Values) {
    setError(null);
    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      if (!res.ok) {
        setError(((await res.json()) as ApiErrorBody).message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: keys.me });
      toast({ title: "PIN updated", description: "Use your new PIN next time you sign in." });
      router.replace("/dashboard");
    } catch {
      setError("Can't reach the server. Check your connection.");
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <Image src="/brand/crest.png" alt="" width={72} height={72} className="mx-auto h-[72px] w-[72px]" />
        <h1 className="mt-4 text-center font-display text-3xl font-bold uppercase">Set a new PIN</h1>
        <p className="mt-1 text-center text-muted">6 to 12 digits. Avoid easy ones like 111111 or 123456.</p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
          <Field id="currentPin" label="Current PIN" error={errors.currentPin?.message}>
            <Input id="currentPin" type="password" inputMode="numeric" maxLength={12} autoComplete="current-password" invalid={Boolean(errors.currentPin)} {...cleaned(register("currentPin"), PIN)} />
          </Field>
          <Field id="newPin" label="New PIN" error={errors.newPin?.message}>
            <Input id="newPin" type="password" inputMode="numeric" maxLength={12} autoComplete="new-password" invalid={Boolean(errors.newPin)} {...cleaned(register("newPin"), PIN)} />
          </Field>
          <Field id="confirm" label="Confirm new PIN" error={errors.confirm?.message}>
            <Input id="confirm" type="password" inputMode="numeric" maxLength={12} autoComplete="new-password" invalid={Boolean(errors.confirm)} {...cleaned(register("confirm"), PIN)} />
          </Field>
          {error && (
            <p role="alert" className="rounded-xl bg-alert-50 px-4 py-3 text-sm font-medium text-alert-700">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting} icon={<KeyRound className="h-5 w-5" />}>
            Save PIN
          </Button>
          <Link href="/dashboard" className="block text-center text-sm font-semibold text-primary">
            Back to dashboard
          </Link>
        </form>
      </Card>
    </main>
  );
}
