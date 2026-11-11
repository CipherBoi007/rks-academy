"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Field, Input, fieldLabel } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { firstOfNextMonth, formatDate } from "@/lib/format";
import { keys, useConfig } from "@/lib/queries";
import type { Policy, PolicyInput, PolicyView } from "@/lib/types";

const money = z.coerce.number({ invalid_type_error: "Enter an amount" }).min(0, "Can't be negative");
const pct = z.coerce.number({ invalid_type_error: "Enter a percentage" }).min(0, "0 to 100").max(100, "0 to 100");

const schema = z
  .object({
    registrationFee: money,
    siblingDiscount2ndPct: pct,
    siblingDiscount3rdPct: pct,
    lateFeeAfterDay: z.coerce.number().int().min(1, "1 to 28").max(28, "1 to 28"),
    lateFeeBase: money,
    lateFeePerDay: money,
    lateFeeMax: money,
  })
  .refine((v) => v.lateFeeMax >= v.lateFeeBase, { path: ["lateFeeMax"], message: "At least the base amount" });

type Values = z.input<typeof schema>;
type Parsed = z.output<typeof schema>;
const FIELDS = [
  "registrationFee",
  "siblingDiscount2ndPct",
  "siblingDiscount3rdPct",
  "lateFeeAfterDay",
  "lateFeeBase",
  "lateFeePerDay",
  "lateFeeMax",
] as const satisfies readonly (keyof Values)[];

function toValues(p: Policy): Values {
  return Object.fromEntries(FIELDS.map((f) => [f, p[f]])) as Values;
}

/** Policy edits are scheduled for the 1st of next month; the current billing cycle keeps its terms. */
export function PolicySheet({ open, onClose, policy }: { open: boolean; onClose: () => void; policy: Policy }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: config } = useConfig();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values, unknown, Parsed>({ resolver: zodResolver(schema), defaultValues: toValues(policy) });

  useEffect(() => {
    if (open) reset(toValues(policy));
  }, [open, policy, reset]);

  const nextCycle = config ? firstOfNextMonth(config.today) : null;

  const save = useMutation({
    mutationFn: (v: Parsed) => api<PolicyView>("/fee-policy", { method: "PUT", body: v satisfies PolicyInput }),
    onSuccess: (view) => {
      queryClient.setQueryData(keys.policy, view);
      toast({ title: "Policy change scheduled", description: view.pending ? `Takes effect on ${formatDate(view.pending.effectiveFrom)}` : undefined });
      onClose();
    },
    onError: (e) => {
      const message = applyServerErrors(e, setError, FIELDS);
      if (message) toast({ tone: "error", title: "Couldn't save the policy", description: message });
    },
  });

  const num = (name: keyof Values, label: string, opts: { suffix?: string } = {}) => (
    <Field id={`policy-${name}`} label={label + (opts.suffix ? ` (${opts.suffix})` : "")} error={errors[name]?.message}>
      <Input id={`policy-${name}`} type="number" inputMode="decimal" min={0} step="any" invalid={Boolean(errors[name])} {...register(name)} />
    </Field>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit policies"
      description={nextCycle ? `Changes take effect from the next billing cycle, ${formatDate(nextCycle)}.` : undefined}
      footer={
        <Button type="submit" form="policy-form" size="lg" className="w-full" loading={save.isPending}>
          Schedule change
        </Button>
      }
    >
      <form id="policy-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5">
        {num("registrationFee", "Registration fee", { suffix: "₹" })}
        <p className={`${fieldLabel} border-t border-line pt-5`}>Sibling discount</p>
        <div className="grid grid-cols-2 gap-3">
          {num("siblingDiscount2ndPct", "2nd child", { suffix: "%" })}
          {num("siblingDiscount3rdPct", "3rd+ child", { suffix: "%" })}
        </div>
        <p className={`${fieldLabel} border-t border-line pt-5`}>Late fee</p>
        <div className="grid grid-cols-2 gap-3">
          {num("lateFeeAfterDay", "After day of month")}
          {num("lateFeeBase", "Base", { suffix: "₹" })}
          {num("lateFeePerDay", "Per extra day", { suffix: "₹" })}
          {num("lateFeeMax", "Maximum", { suffix: "₹" })}
        </div>
      </form>
    </Sheet>
  );
}
