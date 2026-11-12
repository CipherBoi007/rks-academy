"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { MapPin, Pencil, Plus, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Chip, LevelChip } from "@/components/ui/Chip";
import { Switch } from "@/components/ui/Controls";
import { Field, Input, Select, fieldLabel } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { MOBILE, applyServerErrors, cleaned } from "@/lib/forms";
import { formatMobile, formatTimeRange, LEVEL_LABEL, LEVELS } from "@/lib/format";
import { keys, useAdminBatches, useAdminCourts, useCoaches, useStaff } from "@/lib/queries";
import type { Batch, CoachAdmin, CourtAdmin, DayOfWeek, Level } from "@/lib/types";

const DAYS: { value: DayOfWeek; short: string }[] = [
  { value: "MONDAY", short: "Mon" },
  { value: "TUESDAY", short: "Tue" },
  { value: "WEDNESDAY", short: "Wed" },
  { value: "THURSDAY", short: "Thu" },
  { value: "FRIDAY", short: "Fri" },
  { value: "SATURDAY", short: "Sat" },
  { value: "SUNDAY", short: "Sun" },
];

/** Courts, batches and coaches feed every screen, so a change refreshes all of them. */
function useInvalidateFacilities() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [["courts"], ["batches"], keys.coaches, keys.todayCourts, keys.players]) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  };
}

function Row({ title, meta, chips, onEdit, label }: { title: ReactNode; meta: ReactNode; chips?: ReactNode; onEdit: () => void; label: string }) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3.5">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted">{meta}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:justify-end">
        {chips}
        <Button variant="secondary" size="icon" aria-label={label} onClick={onEdit}>
          <Pencil className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </li>
  );
}

const OffChip = () => <Chip className="bg-chip text-muted">Off</Chip>;

// ---- Courts & batches -------------------------------------------------------------------------------------

export function CourtsAndBatchesPanel() {
  const courts = useAdminCourts();
  const batches = useAdminBatches();
  const [court, setCourt] = useState<{ open: boolean; court?: CourtAdmin }>({ open: false });
  const [batch, setBatch] = useState<{ open: boolean; batch?: Batch }>({ open: false });

  if (courts.isError || batches.isError) {
    return (
      <Card>
        <ErrorState error={courts.error ?? batches.error} onRetry={() => {
            courts.refetch();
            batches.refetch();
          }} />
      </Card>
    );
  }
  if (!courts.data || !batches.data) return <Skeleton className="h-72 rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setCourt({ open: true })}>
          Add court
        </Button>
        <Button icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setBatch({ open: true })}>
          Add batch
        </Button>
      </div>
      {courts.data.length === 0 && (
        <Card>
          <EmptyState title="No courts yet" message="Add your first court, then its batches." />
        </Card>
      )}
      {courts.data.map((c) => {
        const own = batches.data.filter((b) => b.court.id === c.id);
        return (
          <Card key={c.id} className={cn("p-4 sm:p-5", !c.active && "opacity-70")}>
            <CardTitle
              action={
                <div className="flex items-center gap-2">
                  {!c.active && <OffChip />}
                  <Button variant="ghost" icon={<Pencil className="h-4 w-4" aria-hidden />} onClick={() => setCourt({ open: true, court: c })}>
                    Edit court
                  </Button>
                </div>
              }
            >
              <span className="flex flex-wrap items-baseline gap-x-3">
                {c.name}
                <span className="inline-flex items-center gap-1 font-sans text-sm font-normal normal-case text-muted">
                  <MapPin className="h-3.5 w-3.5" aria-hidden /> {c.surfaceType}
                </span>
              </span>
            </CardTitle>
            {own.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No batches on this court.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {own.map((b) => (
                  <Row
                    key={b.id}
                    label={`Edit ${b.name}`}
                    onEdit={() => setBatch({ open: true, batch: b })}
                    title={b.name}
                    meta={`${formatTimeRange(b.startTime, b.endTime)} · ${dayList(b.days)} · Coach ${b.coach.name} · ${b.playerCount} players`}
                    chips={
                      <>
                        {b.level && <LevelChip level={b.level} />}
                        {!b.active && <OffChip />}
                      </>
                    }
                  />
                ))}
              </ul>
            )}
          </Card>
        );
      })}
      <CourtSheet open={court.open} court={court.court} onClose={() => setCourt({ open: false })} />
      <BatchSheet open={batch.open} batch={batch.batch} courts={courts.data} onClose={() => setBatch({ open: false })} />
    </div>
  );
}

function dayList(days: string[]) {
  return DAYS.filter((d) => days.includes(d.value)).map((d) => d.short).join(", ");
}

const courtSchema = z.object({
  name: z.string().trim().min(1, "Name the court").max(60),
  surfaceType: z.string().trim().min(1, "Describe the surface").max(60),
  active: z.boolean(),
});

function CourtSheet({ open, court, onClose }: { open: boolean; court?: CourtAdmin; onClose: () => void }) {
  const toast = useToast();
  const refresh = useInvalidateFacilities();
  const form = useForm<z.infer<typeof courtSchema>>({ resolver: zodResolver(courtSchema) });
  const { register, handleSubmit, reset, setError, control, formState: { errors } } = form;

  useEffect(() => {
    if (open) reset({ name: court?.name ?? "", surfaceType: court?.surfaceType ?? "Wooden synthetic", active: court?.active ?? true });
  }, [open, court, reset]);

  const save = useMutation({
    mutationFn: (v: z.infer<typeof courtSchema>) =>
      court ? api(`/courts/${court.id}`, { method: "PUT", body: v }) : api("/courts", { method: "POST", body: v }),
    onSuccess: () => {
      refresh();
      toast({ title: court ? "Court updated" : "Court added" });
      onClose();
    },
    onError: (e) => {
      const message = applyServerErrors(e, setError, ["name", "surfaceType"]);
      if (message) toast({ tone: "error", title: "Couldn't save the court", description: message });
    },
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={court ? "Edit court" : "Add court"}
      footer={<Button type="submit" form="court-form" size="lg" className="w-full" loading={save.isPending}>Save court</Button>}
    >
      <form id="court-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5">
        <Field id="court-name" label="Name" error={errors.name?.message}>
          <Input id="court-name" placeholder="e.g. Court 5" invalid={Boolean(errors.name)} {...register("name")} />
        </Field>
        <Field id="court-surface" label="Surface" error={errors.surfaceType?.message}>
          <Input id="court-surface" placeholder="e.g. BWF synthetic mat" invalid={Boolean(errors.surfaceType)} {...register("surfaceType")} />
        </Field>
        {court && (
          <Controller
            control={control}
            name="active"
            render={({ field }) => <Switch id="court-active" label="In use" checked={field.value} onChange={field.onChange} />}
          />
        )}
      </form>
    </Sheet>
  );
}

const batchSchema = z
  .object({
    name: z.string().trim().min(2, "Name the batch").max(80),
    courtId: z.string().min(1, "Pick a court"),
    coachId: z.string().min(1, "Pick a coach"),
    startTime: z.string().min(1, "Pick a start time"),
    endTime: z.string().min(1, "Pick an end time"),
    days: z.array(z.string()).min(1, "Pick at least one day"),
    level: z.string().optional(),
    active: z.boolean(),
  })
  .refine((v) => v.endTime > v.startTime, { path: ["endTime"], message: "Must be after the start time" });
type BatchValues = z.infer<typeof batchSchema>;

function BatchSheet({ open, batch, courts, onClose }: { open: boolean; batch?: Batch; courts: CourtAdmin[]; onClose: () => void }) {
  const toast = useToast();
  const refresh = useInvalidateFacilities();
  const coaches = useCoaches();
  const { register, handleSubmit, reset, setError, control, formState: { errors } } = useForm<BatchValues>({
    resolver: zodResolver(batchSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: batch?.name ?? "",
      courtId: batch ? String(batch.court.id) : String(courts.find((c) => c.active)?.id ?? ""),
      coachId: batch ? String(batch.coach.id) : "",
      startTime: batch?.startTime.slice(0, 5) ?? "06:00",
      endTime: batch?.endTime.slice(0, 5) ?? "07:00",
      days: batch?.days ?? ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
      level: batch?.level ?? "",
      active: batch?.active ?? true,
    });
  }, [open, batch, courts, reset]);

  const save = useMutation({
    mutationFn: (v: BatchValues) => {
      const body = { ...v, courtId: Number(v.courtId), coachId: Number(v.coachId), level: (v.level || null) as Level | null };
      return batch ? api(`/batches/${batch.id}`, { method: "PUT", body }) : api("/batches", { method: "POST", body });
    },
    onSuccess: () => {
      refresh();
      toast({ title: batch ? "Batch updated" : "Batch added" });
      onClose();
    },
    onError: (e) => {
      const message = applyServerErrors(e, setError, ["name", "courtId", "coachId", "startTime", "endTime", "days"]);
      if (message) toast({ tone: "error", title: "Couldn't save the batch", description: message });
    },
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={batch ? "Edit batch" : "Add batch"}
      description={batch ? `${batch.playerCount} players in this batch` : "A court can't hold two batches at the same time."}
      footer={<Button type="submit" form="batch-form" size="lg" className="w-full" loading={save.isPending}>Save batch</Button>}
    >
      <form id="batch-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5">
        <Field id="batch-name" label="Name" error={errors.name?.message}>
          <Input id="batch-name" placeholder="e.g. Weekend Juniors" invalid={Boolean(errors.name)} {...register("name")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="batch-court" label="Court" error={errors.courtId?.message}>
            <Select id="batch-court" invalid={Boolean(errors.courtId)} {...register("courtId")}>
              <option value="">Pick a court</option>
              {courts.filter((c) => c.active || String(c.id) === String(batch?.court.id)).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field id="batch-coach" label="Coach" error={errors.coachId?.message}>
            <Select id="batch-coach" invalid={Boolean(errors.coachId)} {...register("coachId")}>
              <option value="">Pick a coach</option>
              {coaches.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="batch-start" label="Starts" error={errors.startTime?.message}>
            <Input id="batch-start" type="time" invalid={Boolean(errors.startTime)} {...register("startTime")} />
          </Field>
          <Field id="batch-end" label="Ends" error={errors.endTime?.message}>
            <Input id="batch-end" type="time" invalid={Boolean(errors.endTime)} {...register("endTime")} />
          </Field>
        </div>
        <Controller
          control={control}
          name="days"
          render={({ field }) => (
            <fieldset>
              <legend className={fieldLabel}>Days</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAYS.map((d) => {
                  const on = field.value?.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => field.onChange(on ? field.value.filter((x) => x !== d.value) : [...(field.value ?? []), d.value])}
                      className={cn(
                        "h-11 min-w-[3.25rem] rounded-full border px-3 text-[15px]",
                        on ? "border-ink/80 bg-accent font-semibold" : "border-line bg-white text-ink/80",
                      )}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
              {errors.days && <p role="alert" className="mt-1 text-sm text-alert-700">{errors.days.message}</p>}
            </fieldset>
          )}
        />
        <Field id="batch-level" label="Level">
          <Select id="batch-level" {...register("level")}>
            <option value="">Mixed levels</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
            ))}
          </Select>
        </Field>
        {batch && (
          <Controller
            control={control}
            name="active"
            render={({ field }) => <Switch id="batch-active" label="Running" checked={field.value} onChange={field.onChange} />}
          />
        )}
      </form>
    </Sheet>
  );
}

// ---- Coaches ----------------------------------------------------------------------------------------------

export function CoachesPanel() {
  const coaches = useCoaches(true);
  const staff = useStaff();
  const router = useRouter();
  const [editing, setEditing] = useState<{ open: boolean; coach?: CoachAdmin }>({ open: false });
  const withLogin = new Set(staff.data?.filter((s) => s.active && s.coachId).map((s) => s.coachId));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setEditing({ open: true })}>
          Add coach
        </Button>
      </div>
      {coaches.isError ? (
        <Card>
          <ErrorState error={coaches.error} onRetry={() => coaches.refetch()} />
        </Card>
      ) : !coaches.data ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : coaches.data.length === 0 ? (
        <Card>
          <EmptyState title="No coaches yet" />
        </Card>
      ) : (
        <ul className="space-y-3">
          {coaches.data.map((c) => (
            <li key={c.id} className={cn("flex items-center gap-3 rounded-2xl border border-line bg-white p-4", !c.active && "opacity-70")}>
              <Avatar name={c.name} initials={c.initials} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Coach {c.name}</p>
                <p className="text-sm text-muted">
                  {[c.title, c.mobile && formatMobile(c.mobile), `${c.activeBatches} batches`].filter(Boolean).join(" · ")}
                </p>
              </div>
              {!c.active && <OffChip />}
              {/* A coach profile is who runs batches; a login is who can sign in. One tap links the two. */}
              {c.active && staff.data && !withLogin.has(c.id) && (
                <Button
                  variant="secondary"
                  className="px-3"
                  icon={<UserPlus className="h-4 w-4" aria-hidden />}
                  onClick={() => router.push(`/settings?addLogin=${c.id}`)}
                >
                  <span className="max-sm:sr-only">Create login</span>
                </Button>
              )}
              <Button variant="secondary" size="icon" aria-label={`Edit ${c.name}`} onClick={() => setEditing({ open: true, coach: c })}>
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <CoachSheet open={editing.open} coach={editing.coach} onClose={() => setEditing({ open: false })} />
    </div>
  );
}

const coachSchema = z.object({
  name: z.string().trim().min(2, "Enter the coach's name").max(100),
  title: z.string().trim().max(40).optional(),
  mobile: z.union([z.literal(""), z.string().trim().regex(/^\d{10}$/, "Enter a 10-digit mobile number")]).optional(),
  active: z.boolean(),
});

function CoachSheet({ open, coach, onClose }: { open: boolean; coach?: CoachAdmin; onClose: () => void }) {
  const toast = useToast();
  const refresh = useInvalidateFacilities();
  const { register, handleSubmit, reset, setError, control, formState: { errors } } = useForm<z.infer<typeof coachSchema>>({
    resolver: zodResolver(coachSchema),
  });

  useEffect(() => {
    if (open) reset({ name: coach?.name ?? "", title: coach?.title ?? "", mobile: coach?.mobile ?? "", active: coach?.active ?? true });
  }, [open, coach, reset]);

  const save = useMutation({
    mutationFn: (v: z.infer<typeof coachSchema>) => {
      const body = { ...v, mobile: v.mobile || undefined, title: v.title || undefined };
      return coach ? api(`/coaches/${coach.id}`, { method: "PUT", body }) : api("/coaches", { method: "POST", body });
    },
    onSuccess: () => {
      refresh();
      toast({ title: coach ? "Coach updated" : "Coach added" });
      onClose();
    },
    onError: (e) => {
      const message = applyServerErrors(e, setError, ["name", "title", "mobile"]);
      if (message) toast({ tone: "error", title: "Couldn't save the coach", description: message });
    },
  });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={coach ? "Edit coach" : "Add coach"}
      description="Coaches run batches and appear on schedules. To let one sign in, use Create login in the list."
      footer={<Button type="submit" form="coach-form" size="lg" className="w-full" loading={save.isPending}>Save coach</Button>}
    >
      <form id="coach-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5">
        <Field id="coach-name" label="Name" error={errors.name?.message}>
          <Input id="coach-name" placeholder="e.g. S. Divya" invalid={Boolean(errors.name)} {...register("name")} />
        </Field>
        <Field id="coach-title" label="Title">
          <Input id="coach-title" placeholder="e.g. Junior Coach" {...register("title")} />
        </Field>
        <Field id="coach-mobile" label="Mobile" error={errors.mobile?.message}>
          <Input id="coach-mobile" type="tel" inputMode="numeric" invalid={Boolean(errors.mobile)} {...cleaned(register("mobile"), MOBILE)} />
        </Field>
        {coach && (
          <Controller
            control={control}
            name="active"
            render={({ field }) => <Switch id="coach-active" label="Coaching" checked={field.value} onChange={field.onChange} />}
          />
        )}
      </form>
    </Sheet>
  );
}
