"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Camera, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, fieldLabel } from "@/components/ui/Field";
import { PillGroup } from "@/components/ui/Pills";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import { prepareImage } from "@/lib/images";
import { MOBILE, applyServerErrors, blankToUndefined, cleaned } from "@/lib/forms";
import { ADULT_AGE, contactRole, isAdult } from "@/lib/contact";
import { GENDER_LABEL, LEVEL_LABEL, LEVELS } from "@/lib/format";
import { keys, useAllPlayers, useBatches, useConfig, usePlans } from "@/lib/queries";
import type { ContactRelation, Gender, Level, PlayerDetail, PlayerInput } from "@/lib/types";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const schema = z.object({
  name: z.string().trim().min(2, "Enter the player's full name").max(100),
  dob: z.string().min(1, "Pick a date of birth"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "TOURNAMENT"]),
  batchId: z.string().min(1, "Pick a batch").transform(Number),
  feePlanId: z.string().min(1, "Pick a fee plan").transform(Number),
  joinDate: z.string().optional(),
  contactRelation: z.enum(["SELF", "PARENT", "GUARDIAN"]),
  contactName: z.string().trim().max(100).optional(),
  contactMobile: z.string().trim().regex(/^\d{10}$/, "Enter a 10-digit mobile number"),
  bloodGroup: z.string().optional(),
  address: z.string().trim().max(200).optional(),
  siblingOfPlayerId: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : undefined)),
}).superRefine((v, ctx) => {
  // An adult is their own contact; anyone else needs the parent's or guardian's name.
  if (v.contactRelation !== "SELF" && (v.contactName ?? "").length < 2) {
    ctx.addIssue({
      code: "custom",
      path: ["contactName"],
      message: `Enter the ${v.contactRelation === "PARENT" ? "parent" : "guardian"}'s name`,
    });
  }
});

type Values = z.input<typeof schema>;
type Parsed = z.output<typeof schema>;
const FIELDS = [
  "name", "dob", "gender", "level", "batchId", "feePlanId", "joinDate", "contactRelation", "contactName",
  "contactMobile", "bloodGroup", "address", "siblingOfPlayerId",
];

const RELATIONS: { value: ContactRelation; label: string }[] = [
  { value: "PARENT", label: "Parent" },
  { value: "GUARDIAN", label: "Guardian" },
  { value: "SELF", label: "The player" },
];

function defaults(player?: PlayerDetail, today?: string): Values {
  return {
    name: player?.name ?? "",
    dob: player?.dob ?? "",
    gender: player?.gender ?? "MALE",
    level: player?.level ?? "BEGINNER",
    batchId: player ? String(player.batch.id) : "",
    feePlanId: player ? String(player.plan.id) : "",
    joinDate: player?.joinDate ?? today ?? "",
    contactRelation: player?.contact.relation ?? "PARENT",
    contactName: player && player.contact.relation !== "SELF" ? player.contact.name : "",
    contactMobile: player?.contact.mobile ?? "",
    bloodGroup: player?.bloodGroup ?? "",
    address: player?.address ?? "",
    siblingOfPlayerId: player?.siblings[0] ? String(player.siblings[0].id) : "",
  };
}

/** Add a player (no `player`) or edit one. A photo can be attached in both cases; it uploads after saving. */
export function PlayerSheet({ open, onClose, player }: { open: boolean; onClose: () => void; player?: PlayerDetail }) {
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: config } = useConfig();
  const batches = useBatches();
  const plans = usePlans();
  const others = useAllPlayers(open);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const editing = Boolean(player);

  const form = useForm<Values, unknown, Parsed>({ resolver: zodResolver(schema), defaultValues: defaults(player, config?.today) });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, dirtyFields },
  } = form;

  // "The player" is offered only for adults. A new adult defaults to managing their own account, and a date of
  // birth that makes the player a minor moves the account back to a parent.
  const dob = watch("dob");
  const relation = watch("contactRelation");
  const adult = isAdult(dob, config?.today ?? "");
  const relationTouched = Boolean(dirtyFields.contactRelation);
  useEffect(() => {
    if (!adult && relation === "SELF") setValue("contactRelation", "PARENT");
    else if (adult && !editing && !relationTouched && relation !== "SELF") setValue("contactRelation", "SELF");
  }, [adult, relation, editing, relationTouched, setValue]);

  useEffect(() => {
    if (open) {
      reset(defaults(player, config?.today));
      setPhoto(null);
      setPhotoError(null);
    }
  }, [open, player, config?.today, reset]);

  const save = useMutation({
    mutationFn: async (values: Parsed) => {
      const body = blankToUndefined({
        ...values,
        contactName: values.contactRelation === "SELF" ? undefined : values.contactName,
      }) as unknown as PlayerInput;
      const saved = player
        ? await api<PlayerDetail>(`/players/${player.id}`, { method: "PUT", body })
        : await api<PlayerDetail>("/players", { method: "POST", body });
      if (photo) {
        const data = new FormData();
        data.append("file", photo);
        try {
          await api(`/players/${saved.id}/photo`, { method: "POST", body: data });
        } catch (e) {
          toast({ tone: "error", title: "Player saved, but the photo didn't upload", description: errorMessage(e) });
        }
      }
      return saved;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: keys.players });
      queryClient.invalidateQueries({ queryKey: keys.summary });
      queryClient.invalidateQueries({ queryKey: keys.dues });
      toast({ title: editing ? "Player updated" : `${saved.name} added`, description: `Player ID ${saved.code}` });
      onClose();
      if (!editing) router.push(`/players/${saved.id}`);
    },
    onError: (e) => {
      const message = applyServerErrors(e, setError, FIELDS);
      if (message) toast({ tone: "error", title: "Couldn't save the player", description: message });
    },
  });

  const removePhoto = useMutation({
    mutationFn: () => api(`/players/${player!.id}/photo`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.players });
      toast({ title: "Photo removed" });
    },
    onError: (e) => toast({ tone: "error", title: "Couldn't remove the photo", description: errorMessage(e) }),
  });

  async function onPhoto(file: File | undefined) {
    setPhotoError(null);
    if (!file) return setPhoto(null);
    // Profile photos only ever show small, so 800px is plenty.
    const prepared = await prepareImage(file, 800);
    if (!prepared.ok) return setPhotoError(prepared.error);
    setPhoto(prepared.file);
  }

  const siblingOptions = (others.data ?? []).filter((p) => p.id !== player?.id);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "Edit player" : "Add player"}
      description={editing ? `${player!.name} · ${player!.code}` : "A player ID is assigned automatically."}
      footer={
        <Button type="submit" form="player-form" size="lg" className="w-full" loading={save.isPending}>
          {editing ? "Save changes" : "Add player"}
        </Button>
      }
    >
      <form id="player-form" noValidate onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar
            name={player?.name ?? "New player"}
            initials={player?.initials ?? "RK"}
            photoUrl={player?.photoUrl}
            size="xl"
          />
          <div className="space-y-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-4 font-semibold hover:bg-surface">
              <Camera className="h-5 w-5 text-primary" aria-hidden />
              {photo ? "Change photo" : "Upload photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
            </label>
            {photo && <p className="text-sm text-muted">{photo.name}</p>}
            {photoError && <p role="alert" className="text-sm text-alert-700">{photoError}</p>}
            {player?.photoUrl && !photo && (
              <button
                type="button"
                onClick={() => removePhoto.mutate()}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-alert-700"
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Remove photo
              </button>
            )}
          </div>
        </div>

        <Field id="name" label="Full name" error={errors.name?.message}>
          <Input id="name" autoComplete="off" invalid={Boolean(errors.name)} {...register("name")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="dob" label="Date of birth" error={errors.dob?.message}>
            <Input id="dob" type="date" max={config?.today} invalid={Boolean(errors.dob)} {...register("dob")} />
          </Field>
          <Field id="gender" label="Gender" error={errors.gender?.message}>
            <Select id="gender" {...register("gender")}>
              {(Object.keys(GENDER_LABEL) as Gender[]).map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABEL[g]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="level" label="Level" error={errors.level?.message}>
            <Select id="level" {...register("level")}>
              {LEVELS.map((l: Level) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL[l]}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="bloodGroup" label="Blood group">
            <Select id="bloodGroup" {...register("bloodGroup")}>
              <option value="">Not known</option>
              {BLOOD_GROUPS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field id="batchId" label="Batch" error={errors.batchId?.message}>
          <Select id="batchId" invalid={Boolean(errors.batchId)} {...register("batchId")}>
            <option value="">Pick a batch</option>
            {batches.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.court.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="feePlanId"
          label="Fee plan"
          error={errors.feePlanId?.message}
          hint={editing ? "A new plan starts after the period already paid for." : undefined}
        >
          <Select id="feePlanId" invalid={Boolean(errors.feePlanId)} {...register("feePlanId")}>
            <option value="">Pick a plan</option>
            {plans.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="joinDate" label="Joined on" hint="Billing starts from the 1st of this month.">
          <Input id="joinDate" type="date" {...register("joinDate")} />
        </Field>

        <div className="space-y-2 border-t border-line pt-5">
          <p className={fieldLabel}>Who manages this account?</p>
          <PillGroup<ContactRelation>
            label="Who manages this account?"
            value={relation}
            onChange={(v) => setValue("contactRelation", v, { shouldDirty: true })}
            options={adult ? RELATIONS : RELATIONS.filter((r) => r.value !== "SELF")}
          />
          <p className="text-sm text-muted">
            {relation === "SELF"
              ? "The player gets the fee reminders and signs in to the family app with their own number."
              : adult
                ? "Pick \u201cThe player\u201d if they handle their own fees."
                : `Players under ${ADULT_AGE} need a parent or guardian, who gets the fee reminders and the family app sign-in.`}
          </p>
        </div>
        {relation !== "SELF" && (
          <Field id="contactName" label={`${contactRole(relation)}'s name`} error={errors.contactName?.message}>
            <Input id="contactName" invalid={Boolean(errors.contactName)} {...register("contactName")} />
          </Field>
        )}
        <Field id="contactMobile" label={relation === "SELF" ? "Player's mobile" : "Mobile"} error={errors.contactMobile?.message}>
          <Input
            id="contactMobile"
            type="tel"
            inputMode="numeric"
            placeholder="10 digits"
            invalid={Boolean(errors.contactMobile)}
            {...cleaned(register("contactMobile"), MOBILE)}
          />
        </Field>
        <Field id="address" label="Address">
          <Input id="address" {...register("address")} />
        </Field>
        <Field id="siblingOfPlayerId" label="Sibling at RKS" hint="Siblings get 10% off the 2nd child and 15% off the 3rd.">
          <Select id="siblingOfPlayerId" {...register("siblingOfPlayerId")}>
            <option value="">None</option>
            {siblingOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.code}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Sheet>
  );
}
