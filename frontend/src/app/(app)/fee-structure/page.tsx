"use client";

import { useState, type ReactNode } from "react";
import { BadgePercent, Check, Clock, Pencil, Plus, Ticket, Users } from "lucide-react";
import { OwnerOnly } from "@/components/domain/OwnerOnly";
import { PlanSheet } from "@/components/domain/sheets/PlanSheet";
import { PolicySheet } from "@/components/domain/sheets/PolicySheet";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { formatDate, inr, planPeriodLabel } from "@/lib/format";
import { usePlans, usePolicy } from "@/lib/queries";
import type { FeePlan, Policy } from "@/lib/types";

export default function FeeStructurePage() {
  return (
    <OwnerOnly>
      <FeeStructure />
    </OwnerOnly>
  );
}

function FeeStructure() {
  const plans = usePlans();
  const policy = usePolicy();
  const [editingPlan, setEditingPlan] = useState<{ open: boolean; plan?: FeePlan }>({ open: false });
  const [editingPolicy, setEditingPolicy] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow="Plans & policies"
        title="Fee structure"
        actions={
          <Button icon={<Plus className="h-5 w-5" aria-hidden />} onClick={() => setEditingPlan({ open: true })}>
            Add plan
          </Button>
        }
      />

      {plans.isError ? (
        <Card>
          <ErrorState error={plans.error} onRetry={() => plans.refetch()} />
        </Card>
      ) : !plans.data ? (
        <LoadingRegion label="Loading plans">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        </LoadingRegion>
      ) : plans.data.length === 0 ? (
        <Card>
          <EmptyState title="No plans yet" message="Add the first fee plan to start recording payments." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 pt-3 md:grid-cols-2 xl:grid-cols-4">
          {plans.data.map((p) => (
            <PlanCard key={p.id} plan={p} onEdit={() => setEditingPlan({ open: true, plan: p })} />
          ))}
        </div>
      )}

      <div className="mt-10">
        <CardTitle
          action={
            policy.data && (
              <Button variant="secondary" icon={<Pencil className="h-4 w-4" aria-hidden />} onClick={() => setEditingPolicy(true)}>
                Edit policies
              </Button>
            )
          }
        >
          <span className="text-2xl">Policies</span>
        </CardTitle>
        {policy.isError ? (
          <Card className="mt-4">
            <ErrorState error={policy.error} onRetry={() => policy.refetch()} />
          </Card>
        ) : !policy.data ? (
          <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <Policies policy={policy.data.current} />
            {policy.data.pending && <PendingChange current={policy.data.current} pending={policy.data.pending} />}
            <PolicySheet open={editingPolicy} onClose={() => setEditingPolicy(false)} policy={policy.data.pending ?? policy.data.current} />
          </>
        )}
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-white/70 px-4 py-3 text-[15px] text-muted ring-1 ring-line">
          <BadgePercent className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          Policies apply automatically when fees are recorded. Changes take effect from next billing cycle.
        </p>
      </div>

      <PlanSheet open={editingPlan.open} plan={editingPlan.plan} onClose={() => setEditingPlan({ open: false })} />
    </>
  );
}

function PlanCard({ plan, onEdit }: { plan: FeePlan; onEdit: () => void }) {
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-2xl bg-white p-5",
        plan.mostPopular ? "border-[1.5px] border-ink shadow-hard-primary" : "border border-line shadow-card",
      )}
    >
      {plan.mostPopular && (
        <span className="absolute -top-3 left-6 rounded-full border border-ink bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide">
          Most popular
        </span>
      )}
      <p className="text-sm text-muted">{plan.levelLabel}</p>
      <h2 className="mt-1 font-display text-2xl font-bold uppercase leading-tight xl:text-[28px]">{plan.name}</h2>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-4xl font-bold leading-none text-primary xl:text-[40px]">
          {plan.price !== null && inr(plan.price)}
        </span>
        <span className="whitespace-nowrap text-muted">{planPeriodLabel(plan.periodMonths)}</span>
      </p>
      <ul className="mb-5 mt-5 space-y-3">
        {plan.perks.map((perk) => (
          <li key={perk} className="flex items-start gap-3 text-[15px]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            {perk}
          </li>
        ))}
      </ul>
      <p className="mb-3 mt-auto text-sm text-muted">
        {plan.playerCount} {plan.playerCount === 1 ? "player" : "players"} on this plan
      </p>
      <Button variant="secondary" className="w-full" icon={<Pencil className="h-4 w-4" aria-hidden />} onClick={onEdit}>
        Edit plan
      </Button>
    </article>
  );
}

function PolicyCard({ icon, tone, label, value, detail }: { icon: ReactNode; tone: "primary" | "alert"; label: string; value: string; detail: string }) {
  return (
    <Card className="flex gap-4 p-5">
      <span
        className={cn(
          "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          tone === "alert" ? "bg-alert-50 text-alert" : "bg-primary text-white",
        )}
        aria-hidden
      >
        {icon}
      </span>
      <div>
        <p className="font-semibold">{label}</p>
        <p className={cn("font-display text-[32px] font-bold leading-tight", tone === "alert" && "text-alert")}>{value}</p>
        <p className="text-sm text-muted">{detail}</p>
      </div>
    </Card>
  );
}

function lateFeeText(p: Policy) {
  return `${inr(p.lateFeeBase)} after the ${ordinal(p.lateFeeAfterDay)} of the month, then ${inr(p.lateFeePerDay)}/day (max ${inr(p.lateFeeMax)})`;
}

function Policies({ policy }: { policy: Policy }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-3">
      <PolicyCard
        tone="primary"
        icon={<Ticket className="h-6 w-6" />}
        label="Registration fee"
        value={inr(policy.registrationFee)}
        detail="Academy jersey, ID card & insurance cover"
      />
      <PolicyCard
        tone="primary"
        icon={<Users className="h-6 w-6" />}
        label="Sibling discount"
        value={`${policy.siblingDiscount2ndPct}% off`}
        detail={`${policy.siblingDiscount2ndPct}% off the second child's plan, ${policy.siblingDiscount3rdPct}% off the third`}
      />
      <PolicyCard tone="alert" icon={<Clock className="h-6 w-6" />} label="Late fee rule" value={inr(policy.lateFeeBase)} detail={lateFeeText(policy)} />
    </div>
  );
}

function PendingChange({ current, pending }: { current: Policy; pending: Policy }) {
  const changes = [
    current.registrationFee !== pending.registrationFee && `registration fee ${inr(pending.registrationFee)}`,
    (current.siblingDiscount2ndPct !== pending.siblingDiscount2ndPct || current.siblingDiscount3rdPct !== pending.siblingDiscount3rdPct) &&
      `sibling discount ${pending.siblingDiscount2ndPct}% / ${pending.siblingDiscount3rdPct}%`,
    (current.lateFeeAfterDay !== pending.lateFeeAfterDay ||
      current.lateFeeBase !== pending.lateFeeBase ||
      current.lateFeePerDay !== pending.lateFeePerDay ||
      current.lateFeeMax !== pending.lateFeeMax) &&
      `late fee ${lateFeeText(pending)}`,
  ].filter(Boolean);
  return (
    <p className="mt-4 rounded-xl border border-primary/30 bg-primary-50 px-4 py-3 text-[15px] text-primary-700">
      <strong>Scheduled from {formatDate(pending.effectiveFrom)}:</strong>{" "}
      {changes.length ? changes.join("; ") : "no changes to the current terms"}.
    </p>
  );
}

function ordinal(n: number) {
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${suffix}`;
}
