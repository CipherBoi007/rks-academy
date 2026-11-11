"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Lock, Phone } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import type { ApiErrorBody, LoginResult } from "@/lib/types";

const schema = z.object({
  mobile: z
    .string()
    .transform((v) => v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""))
    .pipe(z.string().regex(/^\d{10}$/, "Enter your 10-digit mobile number")),
  pin: z.string().regex(/^\d{4,6}$/, "PIN is 4 to 6 digits"),
});

type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

/** Only same-site paths are allowed as a post-login destination. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormIn, unknown, FormOut>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormOut) {
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = (await res.json()) as LoginResult | ApiErrorBody;
      if (!res.ok) {
        setError((body as ApiErrorBody).message);
        return;
      }
      const next = (body as LoginResult).mustChangePin ? "/change-pin" : safeNext(params.get("next"));
      router.replace(next);
      router.refresh();
    } catch {
      setError("Can't reach the server. Check your connection.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-4 short:mt-3 short:space-y-3 tall:mt-8 tall:space-y-5 md:mt-8 md:space-y-5">
      <Field id="mobile" label="Mobile number" error={errors.mobile?.message}>
        <Input
          id="mobile"
          type="tel"
          inputMode="numeric"
          autoComplete="username"
          placeholder="00000 00000"
          prefix="+91"
          icon={<Phone className="h-5 w-5" />}
          invalid={Boolean(errors.mobile)}
          {...register("mobile")}
        />
      </Field>
      <Field id="pin" label="PIN" error={errors.pin?.message}>
        <Input
          id="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={6}
          placeholder="••••"
          icon={<Lock className="h-5 w-5" />}
          invalid={Boolean(errors.pin)}
          {...register("pin")}
        />
      </Field>
      {error && (
        <p role="alert" className="rounded-xl bg-alert-50 px-4 py-3 text-sm font-medium text-alert-700">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting} trailingIcon={<ArrowRight className="h-5 w-5" />}>
        Enter academy
      </Button>
    </form>
  );
}
