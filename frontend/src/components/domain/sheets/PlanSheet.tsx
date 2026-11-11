"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useFieldArray, useForm, type DefaultValues } from "react-hook-form";
import { z } from "zod";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Controls";
import { Field, Input, Select, fieldLabel } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { keys } from "@/lib/queries";
import type { FeePlan, FeePlanInput } from "@/lib/types";

const MAX_PERKS = 6;

const schema = z.object({
  name: z.string().trim().min(2, "Name the plan").max(60),
  levelLabel: z.string().trim().min(2, "Who is this plan for?").max(80),
  price: z.coerce.number({ invalid_type_error: "Enter a price" }).positive("Enter a price").max(99_999_999),
  periodMonths: z.coerce.number().int().min(1).max(12),
  sessionsPerWeek: z.coerce.number().int().min(1, "1 to 7").max(7, "1 to 7"),
  perks: z.array(z.object({ text: z.string().trim().min(1, "Write the perk or remove it").max(120) })).max(MAX_PERKS),
  mostPopular: z.boolean(),
});

type Values = z.input<typeof schema>;
type Parsed = z.output<typeof schema>;
const FIELDS = ["name", "levelLabel", "price", "periodMonths", "sessionsPerWeek", "perks", "mostPopular"];

function defaults(plan?: FeePlan): DefaultValues<Values> {
  return {
    name: plan?.name ?? "",
    levelLabel: plan?.levelLabel ?? "",
    price: plan?.price ?? undefined,
    periodMonths: plan?.periodMonths ?? 1,
    sessionsPerWeek: plan?.sessionsPerWeek ?? 5,
    perks: (plan?.perks ?? [""]).map((text) => ({ text })),
    mostPopular: plan?.mostPopular ?? false,
  };
}

/** Add or edit a fee plan. Price changes apply to payments recorded from now on. */
export function PlanSheet({ open, onClose, plan }: { open: boolean; onClose: () => void; plan?: FeePlan }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values, unknown, Parsed>({ resolver: zodResolver(schema), defaultValues: defaults(plan) });
  const perks = useFieldArray({ control, name: "perks" });

  useEffect(() => {
    if (open) reset(defaults(plan));
  }, [open, plan, reset]);

  function done(title: string) {
    queryClient.invalidateQueries({ queryKey: keys.plans });
    toast({ title });
    onClose();
  }

  const save = useMutation({
    mutationFn: (v: Parsed) => {
      const body: FeePlanInput = { ...v, perks: v.perks.map((p) => p.text) };
      return plan
        ? api<FeePlan>(`/fee-plans/${plan.id}`, { method: "PUT", body })
        : api<FeePlan>("/fee-plans", { method: "POST", body });
    },
    onSuccess: (saved) => done(plan ? `${saved.name} updated` : `${saved.name} plan added`),
    onError: (e) => {
      const message = applyServerErrors(e, setError, FIELDS);
      if (message) toast({ tone: "error", title: "Couldn't save the plan", description: message });
    },
  });

  const archive = useMutation({
    mutationFn: () => api(`/fee-plans/${plan!.id}`, { method: "DELETE" }),
    onSuccess: () => done(`${plan!.name} archived`),
    onError: (e) => toast({ tone: "error", title: "Couldn't archive the plan", description: errorMessage(e) }),
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={plan ? "Edit plan" : "Add plan"}
      description={plan ? "Changes apply to payments recorded from now on." : "Plans appear on the Fee Structure page."}
      footer={
        <div className="flex gap-3">
          {plan && (
            <Button
              variant="danger"
              icon={<Trash2 className="h-4 w-4" aria-hidden />}
              loading={archive.isPending}
              disabled={plan.playerCount > 0}
              title={plan.playerCount > 0 ? "Move its players to another plan first" : undefined}
              onClick={() => archive.mutate()}
            >
              Archive
            </Button>
          )}
          <Button type="submit" form="plan-form" size="lg" className="flex-1" loading={save.isPending}>
            {plan ? "Save plan" : "Add plan"}
          </Button>
        </div>
      }
    >
      <form id="plan-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5">
        <Field id="plan-name" label="Plan name" error={errors.name?.message}>
          <Input id="plan-name" placeholder="e.g. Quarterly" invalid={Boolean(errors.name)} {...register("name")} />
        </Field>
        <Field id="plan-level" label="For" error={errors.levelLabel?.message}>
          <Input id="plan-level" placeholder="e.g. All skill levels" invalid={Boolean(errors.levelLabel)} {...register("levelLabel")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="plan-price" label="Price (₹)" error={errors.price?.message}>
            <Input id="plan-price" type="number" inputMode="numeric" min={1} invalid={Boolean(errors.price)} {...register("price")} />
          </Field>
          <Field
            id="plan-period"
            label="Billing period"
            error={errors.periodMonths?.message}
            hint={plan && plan.playerCount > 0 ? "Locked while players are on this plan" : undefined}
          >
            <Select id="plan-period" disabled={Boolean(plan && plan.playerCount > 0)} {...register("periodMonths")}>
              <option value={1}>Monthly</option>
              <option value={3}>Quarterly (3 months)</option>
              <option value={6}>Half-yearly (6 months)</option>
              <option value={12}>Annual (12 months)</option>
            </Select>
          </Field>
        </div>
        <Field id="plan-sessions" label="Sessions per week" error={errors.sessionsPerWeek?.message}>
          <Input id="plan-sessions" type="number" inputMode="numeric" min={1} max={7} invalid={Boolean(errors.sessionsPerWeek)} {...register("sessionsPerWeek")} />
        </Field>

        <fieldset className="space-y-2">
          <legend className={fieldLabel}>Perks</legend>
          {perks.fields.map((f, i) => (
            <div key={f.id}>
              <div className="flex gap-2">
                <Input
                  id={`perk-${i}`}
                  aria-label={`Perk ${i + 1}`}
                  placeholder="e.g. Shuttles included"
                  invalid={Boolean(errors.perks?.[i]?.text)}
                  {...register(`perks.${i}.text`)}
                />
                <Button variant="secondary" size="icon" aria-label={`Remove perk ${i + 1}`} onClick={() => perks.remove(i)}>
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              {errors.perks?.[i]?.text && (
                <p id={`perk-${i}-error`} role="alert" className="mt-1 text-sm text-alert-700">
                  {errors.perks[i]?.text?.message}
                </p>
              )}
            </div>
          ))}
          {perks.fields.length < MAX_PERKS && (
            <Button variant="ghost" icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => perks.append({ text: "" })}>
              Add perk
            </Button>
          )}
        </fieldset>

        <Controller
          control={control}
          name="mostPopular"
          render={({ field }) => (
            <Switch id="plan-popular" label="Mark as Most Popular" checked={field.value} onChange={field.onChange} />
          )}
        />
      </form>
    </Sheet>
  );
}
