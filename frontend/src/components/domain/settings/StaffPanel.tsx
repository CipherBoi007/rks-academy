"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Copy, KeyRound, Pencil, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Switch } from "@/components/ui/Controls";
import { Field, Input, Select } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import { MOBILE, applyServerErrors, cleaned } from "@/lib/forms";
import { formatMobile } from "@/lib/format";
import { keys, useCoaches, useMe, useStaff } from "@/lib/queries";
import type { Role, Staff, StaffWithPin } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(2, "Enter the person's name").max(100),
  mobile: z.string().trim().regex(/^\d{10}$/, "Enter a 10-digit mobile number"),
  role: z.enum(["OWNER", "COACH"]),
  coachId: z.string().optional(),
  active: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function StaffPanel() {
  const staff = useStaff();
  const { data: me } = useMe();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ open: boolean; staff?: Staff; coachId?: number }>({ open: false });
  const [issued, setIssued] = useState<StaffWithPin | null>(null);
  const router = useRouter();
  const addLoginFor = useSearchParams().get("addLogin");

  // "Create login" on the Coaches tab lands here with ?addLogin=<coachId>: open the form already filled in.
  useEffect(() => {
    if (!addLoginFor) return;
    setEditing({ open: true, coachId: Number(addLoginFor) });
    router.replace("/settings", { scroll: false });
  }, [addLoginFor, router]);

  const reset = useMutation({
    mutationFn: (id: number) => api<StaffWithPin>(`/staff/${id}/reset-pin`, { method: "POST" }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: keys.staff });
      setIssued(res);
    },
    onError: (e) => toast({ tone: "error", title: "Couldn't reset the PIN", description: errorMessage(e) }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button icon={<UserPlus className="h-5 w-5" aria-hidden />} onClick={() => setEditing({ open: true })}>
          Add login
        </Button>
      </div>

      {staff.isError ? (
        <Card>
          <ErrorState error={staff.error} onRetry={() => staff.refetch()} />
        </Card>
      ) : !staff.data ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : staff.data.length === 0 ? (
        <Card>
          <EmptyState title="No logins yet" />
        </Card>
      ) : (
        <ul className="space-y-3">
          {staff.data.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4">
              <Avatar name={s.name} initials={s.initials} size="md" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {s.name}
                  {s.id === me?.id && <span className="text-sm font-normal text-muted">(you)</span>}
                </p>
                <p className="text-sm text-muted">
                  {formatMobile(s.mobile)}
                  {s.coachName && ` · Coach ${s.coachName}`}
                </p>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <Chip className={s.role === "OWNER" ? "bg-primary text-white" : "bg-primary-50 text-primary"}>
                  {s.role === "OWNER" ? "Owner" : "Coach"}
                </Chip>
                {!s.active && <Chip className="bg-chip text-muted">Off</Chip>}
                {s.active && s.mustChangePin && <Chip className="bg-alert-50 text-alert-700">PIN not set yet</Chip>}
                <Button
                  variant="secondary"
                  icon={<KeyRound className="h-4 w-4" aria-hidden />}
                  disabled={!s.active}
                  loading={reset.isPending && reset.variables === s.id}
                  onClick={() => reset.mutate(s.id)}
                >
                  Reset PIN
                </Button>
                <Button variant="secondary" size="icon" aria-label={`Edit ${s.name}`} onClick={() => setEditing({ open: true, staff: s })}>
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <StaffSheet
        open={editing.open}
        staff={editing.staff}
        presetCoachId={editing.coachId}
        logins={staff.data ?? []}
        isSelf={editing.staff?.id === me?.id}
        onClose={() => setEditing({ open: false })}
        onIssued={setIssued}
      />
      <PinIssued issued={issued} onClose={() => setIssued(null)} />
    </div>
  );
}

/**
 * Adds or edits a login. A coach's login starts from their coach profile: picking the coach fills in their name
 * and mobile, so nothing is typed twice.
 */
function StaffSheet({
  open,
  staff,
  presetCoachId,
  logins,
  isSelf,
  onClose,
  onIssued,
}: {
  open: boolean;
  staff?: Staff;
  /** Opens a new login already linked to (and filled in from) this coach. */
  presetCoachId?: number;
  /** Existing logins, to mark coaches who already have one. */
  logins: Staff[];
  isSelf: boolean;
  onClose: () => void;
  onIssued: (res: StaffWithPin) => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const coaches = useCoaches();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      const preset = coaches.data?.find((c) => c.id === presetCoachId);
      reset({
        name: staff?.name ?? preset?.name ?? "",
        mobile: staff?.mobile ?? preset?.mobile ?? "",
        role: staff?.role ?? "COACH",
        coachId: staff?.coachId ? String(staff.coachId) : preset ? String(preset.id) : "",
        active: staff?.active ?? true,
      });
    }
  }, [open, staff, presetCoachId, coaches.data, reset]);

  /** New logins copy the picked coach's name and mobile (both can still be edited). */
  function fillFromCoach(coachId: string) {
    const coach = coaches.data?.find((c) => String(c.id) === coachId);
    if (staff || !coach) return;
    setValue("name", coach.name, { shouldValidate: Boolean(errors.name) });
    if (coach.mobile) setValue("mobile", coach.mobile, { shouldValidate: Boolean(errors.mobile) });
  }

  const role = watch("role");
  const linkedCoachIds = new Set(logins.filter((l) => l.id !== staff?.id && l.coachId).map((l) => l.coachId));

  const save = useMutation({
    mutationFn: (v: Values): Promise<Staff | StaffWithPin> => {
      const coachId = v.coachId ? Number(v.coachId) : undefined;
      return staff
        ? api<Staff>(`/staff/${staff.id}`, { method: "PUT", body: { name: v.name, role: v.role, coachId, active: v.active } })
        : api<StaffWithPin>("/staff", { method: "POST", body: { name: v.name, mobile: v.mobile, role: v.role, coachId } });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: keys.staff });
      onClose();
      if ("temporaryPin" in res) onIssued(res);
      else toast({ title: "Login updated", description: res.active ? undefined : `${res.name} can no longer sign in` });
    },
    onError: (e) => {
      const message = applyServerErrors(e, setError, ["name", "mobile", "role", "coachId"]);
      if (message) toast({ tone: "error", title: "Couldn't save the login", description: message });
    },
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={staff ? "Edit login" : "Add login"}
      description={staff ? formatMobile(staff.mobile) : "They'll get a one-time PIN to change at first sign-in."}
      footer={
        <Button type="submit" form="staff-form" size="lg" className="w-full" loading={save.isPending}>
          {staff ? "Save" : "Create login"}
        </Button>
      }
    >
      <form id="staff-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5">
        <Field id="staff-role" label="Role" hint={isSelf ? "You can't change your own role." : "Owners see fees and manage settings."}>
          <Select id="staff-role" disabled={isSelf} {...register("role")}>
            {(["COACH", "OWNER"] as Role[]).map((r) => (
              <option key={r} value={r}>
                {r === "OWNER" ? "Owner" : "Coach"}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="staff-coach"
          label={role === "OWNER" ? "Also coaches as (optional)" : "Which coach is this login for?"}
          hint={
            staff
              ? "Links the login to a coach, so they're greeted as “Coach …”."
              : "Their name and mobile are filled in from the coach's profile."
          }
        >
          <Select id="staff-coach" {...register("coachId", { onChange: (e) => fillFromCoach(e.target.value) })}>
            <option value="">{role === "OWNER" ? "Doesn't coach" : "Pick a coach"}</option>
            {coaches.data?.map((c) => (
              <option key={c.id} value={c.id} disabled={linkedCoachIds.has(c.id)}>
                {c.name}
                {linkedCoachIds.has(c.id) ? " (has a login)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="staff-name" label="Name" error={errors.name?.message}>
          <Input id="staff-name" invalid={Boolean(errors.name)} {...register("name")} />
        </Field>
        <Field id="staff-mobile" label="Mobile number" error={errors.mobile?.message} hint={staff ? "Mobile numbers can't be changed." : undefined}>
          <Input id="staff-mobile" type="tel" inputMode="numeric" disabled={Boolean(staff)} invalid={Boolean(errors.mobile)} {...cleaned(register("mobile"), MOBILE)} />
        </Field>
        {staff && !isSelf && (
          <Switch id="staff-active" label="Can sign in" checked={watch("active")} onChange={(v) => setValue("active", v)} />
        )}
      </form>
    </Sheet>
  );
}

/** Shows a one-time PIN once. It is never stored in plain text, so it can't be shown again later. */
function PinIssued({ issued, onClose }: { issued: StaffWithPin | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [issued]);
  if (!issued) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(issued!.temporaryPin);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="One-time PIN"
      description={`For ${issued.staff.name} · ${formatMobile(issued.staff.mobile)}`}
      footer={
        <Button size="lg" className="w-full" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="select-all rounded-2xl border border-ink bg-accent px-4 py-5 text-center font-display text-5xl font-bold tracking-[0.3em]">
          {issued.temporaryPin}
        </p>
        <Button variant="secondary" className="w-full" icon={<Copy className="h-4 w-4" aria-hidden />} onClick={copy}>
          {copied ? "Copied" : "Copy PIN"}
        </Button>
        <p className="text-[15px] text-muted">
          Share it with them in person or by phone. They&apos;ll be asked to choose their own PIN at first sign-in.
          This PIN won&apos;t be shown again; use Reset PIN if it&apos;s lost.
        </p>
      </div>
    </Sheet>
  );
}
