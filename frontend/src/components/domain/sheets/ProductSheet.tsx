"use client";

/* eslint-disable @next/next/no-img-element -- previews of uploads served by the authenticated proxy */
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm, type DefaultValues } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, ImagePlus, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Controls";
import { Field, Input, Select, Textarea, fieldLabel } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import { prepareImage } from "@/lib/images";
import { applyServerErrors } from "@/lib/forms";
import { CATEGORY_LABEL } from "@/lib/format";
import type { AdPlacement, Product, ProductCategory, ProductInput } from "@/lib/types";

const MAX_IMAGES = 8;
const optionalNumber = z
  .union([z.literal(""), z.coerce.number()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

const schema = z
  .object({
    brand: z.string().trim().min(1, "Enter the brand").max(40),
    category: z.enum(["RACKETS", "SHUTTLECOCKS", "SHOES", "GRIPS", "BAGS", "JERSEYS"]),
    name: z.string().trim().min(2, "Enter the product name").max(120),
    description: z.string().trim().max(2000).optional(),
    price: z.coerce.number({ invalid_type_error: "Enter the price" }).positive("Enter the price"),
    mrp: z.coerce.number({ invalid_type_error: "Enter the MRP" }).positive("Enter the MRP"),
    rating: optionalNumber.refine((v) => v === null || (v >= 0 && v <= 5), "0 to 5"),
    reviewCount: z.coerce.number().int().min(0).default(0),
    stock: optionalNumber.refine((v) => v === null || (Number.isInteger(v) && v >= 0), "A whole number"),
    tagLabel: z.string().trim().max(30).optional(),
    specs: z.array(z.object({ label: z.string().trim().min(1, "Label").max(60), value: z.string().trim().min(1, "Value").max(120) })).max(20),
    variants: z.array(z.object({ group: z.string().trim().min(1, "Group").max(40), value: z.string().trim().min(1, "Option").max(40) })).max(30),
    advertised: z.boolean(),
    adPlacement: z.string().optional(),
    adHeadline: z.string().trim().max(80).optional(),
    adHighlight: z.string().trim().max(40).optional(),
    adCopy: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.price <= v.mrp, { path: ["price"], message: "Price can't be more than the MRP" })
  .refine((v) => !v.advertised || Boolean(v.adPlacement), { path: ["adPlacement"], message: "Pick where the ad shows" });

type Values = z.input<typeof schema>;
type Parsed = z.output<typeof schema>;
const FIELDS = ["brand", "category", "name", "description", "price", "mrp", "rating", "reviewCount", "stock", "tagLabel", "adPlacement"];

function defaults(p?: Product): DefaultValues<Values> {
  return {
    brand: p?.brand ?? "",
    category: p?.category ?? "RACKETS",
    name: p?.name ?? "",
    description: p?.description ?? "",
    price: p?.price,
    mrp: p?.mrp,
    rating: p?.rating ?? "",
    reviewCount: p?.reviewCount ?? 0,
    stock: p?.stock ?? "",
    tagLabel: p?.tagLabel ?? "",
    specs: p?.specs ?? [],
    variants: p?.variants.flatMap((g) => g.values.map((value) => ({ group: g.name, value }))) ?? [],
    advertised: Boolean(p?.ad),
    adPlacement: p?.ad?.placement ?? "",
    adHeadline: p?.ad?.headline ?? "",
    adHighlight: p?.ad?.highlight ?? "",
    adCopy: p?.ad?.copy ?? "",
  };
}

/** Add or edit a pro-shop product, upload its photos, and choose whether it is advertised. */
export function ProductSheet({ open, onClose, product }: { open: boolean; onClose: () => void; product?: Product }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<string[]>([]);
  const [adImage, setAdImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const { register, control, handleSubmit, reset, setError, watch, formState: { errors } } = useForm<Values, unknown, Parsed>({
    resolver: zodResolver(schema),
  });
  const specs = useFieldArray({ control, name: "specs" });
  const variants = useFieldArray({ control, name: "variants" });
  const advertised = watch("advertised");
  const placement = watch("adPlacement");

  useEffect(() => {
    if (!open) return;
    reset(defaults(product));
    setImages(product?.images ?? []);
    setAdImage(product?.ad?.image ?? null);
    setImageError(null);
  }, [open, product, reset]);

  async function upload(file: File | undefined, target: "gallery" | "banner") {
    setImageError(null);
    if (!file) return;
    setUploading(true);
    try {
      const prepared = await prepareImage(file);
      if (!prepared.ok) return setImageError(prepared.error);
      const data = new FormData();
      data.append("file", prepared.file);
      const { url } = await api<{ url: string }>("/products/images", { method: "POST", body: data });
      if (target === "banner") setAdImage(url);
      else setImages((list) => [...list, url].slice(0, MAX_IMAGES));
    } catch (e) {
      setImageError(errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  function done(title: string) {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast({ title });
    onClose();
  }

  const save = useMutation({
    mutationFn: (v: Parsed) => {
      const body: ProductInput = {
        ...v,
        description: v.description || undefined,
        tagLabel: v.tagLabel || undefined,
        images,
        adPlacement: v.advertised ? (v.adPlacement as AdPlacement) : null,
        adImage: v.advertised && adImage ? adImage : undefined,
      };
      return product ? api<Product>(`/products/${product.id}`, { method: "PUT", body }) : api<Product>("/products", { method: "POST", body });
    },
    onSuccess: (p) => done(product ? `${p.name} updated` : `${p.name} added to the store`),
    onError: (e) => {
      const message = applyServerErrors(e, setError, FIELDS);
      if (message) toast({ tone: "error", title: "Couldn't save the product", description: message });
    },
  });

  const archive = useMutation({
    mutationFn: () =>
      product!.active
        ? api(`/products/${product!.id}`, { method: "DELETE" })
        : api(`/products/${product!.id}/restore`, { method: "POST" }),
    onSuccess: () => done(product!.active ? `${product!.name} archived` : `${product!.name} is back in the store`),
    onError: (e) => toast({ tone: "error", title: "Couldn't update the product", description: errorMessage(e) }),
  });

  function submit(v: Parsed) {
    if (images.length === 0) return setImageError("Add at least one photo");
    save.mutate(v);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={product ? "Edit product" : "Add product"}
      description={product && !product.active ? "Archived: hidden from the store." : "Shown to everyone signed in to the app."}
      footer={
        <div className="flex gap-3">
          {product && (
            <Button
              variant={product.active ? "danger" : "secondary"}
              icon={product.active ? <Trash2 className="h-4 w-4" aria-hidden /> : <RotateCcw className="h-4 w-4" aria-hidden />}
              loading={archive.isPending}
              onClick={() => archive.mutate()}
            >
              {product.active ? "Archive" : "Restore"}
            </Button>
          )}
          <Button type="submit" form="product-form" size="lg" className="flex-1" loading={save.isPending} disabled={uploading}>
            Save product
          </Button>
        </div>
      }
    >
      <form id="product-form" noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
        <fieldset>
          <legend className={fieldLabel}>Photos</legend>
          <p className="mt-1 text-sm text-muted">The first photo is the cover. Square photos look best.</p>
          <ul className="mt-3 grid grid-cols-4 gap-2">
            {images.map((src, i) => (
              <li key={src} className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-line">
                <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                <div className="absolute inset-x-1 bottom-1 flex justify-between">
                  {i > 0 ? (
                    <button
                      type="button"
                      aria-label={`Make photo ${i + 1} the cover`}
                      onClick={() => setImages((l) => [l[i], ...l.filter((_, j) => j !== i)])}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-ink"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden />
                    </button>
                  ) : (
                    <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold uppercase">Cover</span>
                  )}
                  <button
                    type="button"
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => setImages((l) => l.filter((_, j) => j !== i))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-ink"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
            {images.length < MAX_IMAGES && (
              <li>
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-sm text-muted hover:bg-surface">
                  <ImagePlus className="h-6 w-6 text-primary" aria-hidden />
                  {uploading ? "Uploading…" : "Add"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => upload(e.target.files?.[0], "gallery")} />
                </label>
              </li>
            )}
          </ul>
          {imageError && <p role="alert" className="mt-2 text-sm text-alert-700">{imageError}</p>}
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <Field id="p-brand" label="Brand" error={errors.brand?.message}>
            <Input id="p-brand" placeholder="e.g. Yonex" invalid={Boolean(errors.brand)} {...register("brand")} />
          </Field>
          <Field id="p-category" label="Category">
            <Select id="p-category" {...register("category")}>
              {(Object.keys(CATEGORY_LABEL) as ProductCategory[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field id="p-name" label="Name" error={errors.name?.message}>
          <Input id="p-name" invalid={Boolean(errors.name)} {...register("name")} />
        </Field>
        <Field id="p-description" label="Description">
          <Textarea id="p-description" maxLength={2000} {...register("description")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="p-price" label="Price (₹)" error={errors.price?.message}>
            <Input id="p-price" type="number" inputMode="decimal" min={0} step="any" invalid={Boolean(errors.price)} {...register("price")} />
          </Field>
          <Field id="p-mrp" label="MRP (₹)" error={errors.mrp?.message}>
            <Input id="p-mrp" type="number" inputMode="decimal" min={0} step="any" invalid={Boolean(errors.mrp)} {...register("mrp")} />
          </Field>
          <Field id="p-stock" label="In stock" hint="Leave empty if not tracked" error={errors.stock?.message}>
            <Input id="p-stock" type="number" inputMode="numeric" min={0} invalid={Boolean(errors.stock)} {...register("stock")} />
          </Field>
          <Field id="p-tag" label="Tag" hint="e.g. 18% OFF">
            <Input id="p-tag" maxLength={30} {...register("tagLabel")} />
          </Field>
          <Field id="p-rating" label="Rating (0–5)" error={errors.rating?.message}>
            <Input id="p-rating" type="number" inputMode="decimal" min={0} max={5} step="0.1" invalid={Boolean(errors.rating)} {...register("rating")} />
          </Field>
          <Field id="p-reviews" label="Reviews">
            <Input id="p-reviews" type="number" inputMode="numeric" min={0} {...register("reviewCount")} />
          </Field>
        </div>

        <fieldset className="space-y-2 border-t border-line pt-5">
          <legend className={fieldLabel}>Specs</legend>
          {specs.fields.map((f, i) => (
            <div key={f.id} className="flex gap-2">
              <Input id={`spec-label-${i}`} aria-label={`Spec ${i + 1} label`} placeholder="e.g. Weight" invalid={Boolean(errors.specs?.[i]?.label)} {...register(`specs.${i}.label`)} />
              <Input id={`spec-value-${i}`} aria-label={`Spec ${i + 1} value`} placeholder="e.g. 83 g" invalid={Boolean(errors.specs?.[i]?.value)} {...register(`specs.${i}.value`)} />
              <Button variant="secondary" size="icon" aria-label={`Remove spec ${i + 1}`} onClick={() => specs.remove(i)}>
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ))}
          <Button variant="ghost" icon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => specs.append({ label: "", value: "" })}>
            Add spec
          </Button>
        </fieldset>

        <fieldset className="space-y-2 border-t border-line pt-5">
          <legend className={fieldLabel}>Options</legend>
          <p className="text-sm text-muted">Options in the same group show together, e.g. group “Size”, options 7, 8, 9.</p>
          {variants.fields.map((f, i) => (
            <div key={f.id} className="flex gap-2">
              <Input id={`var-group-${i}`} aria-label={`Option ${i + 1} group`} placeholder="Group" invalid={Boolean(errors.variants?.[i]?.group)} {...register(`variants.${i}.group`)} />
              <Input id={`var-value-${i}`} aria-label={`Option ${i + 1}`} placeholder="Option" invalid={Boolean(errors.variants?.[i]?.value)} {...register(`variants.${i}.value`)} />
              <Button variant="secondary" size="icon" aria-label={`Remove option ${i + 1}`} onClick={() => variants.remove(i)}>
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            icon={<Plus className="h-4 w-4" aria-hidden />}
            onClick={() => variants.append({ group: variants.fields.at(-1)?.group ?? "", value: "" })}
          >
            Add option
          </Button>
        </fieldset>

        <fieldset className="space-y-4 border-t border-line pt-5">
          <legend className={fieldLabel}>Advertising</legend>
          <p className="text-sm text-muted">Offers appear only to parents in the family app, never to staff.</p>
          <Controller
            control={control}
            name="advertised"
            render={({ field }) => <Switch id="p-advertised" label="Advertise this product" checked={field.value} onChange={field.onChange} />}
          />
          {advertised && (
            <>
              <Field id="p-placement" label="Where" error={errors.adPlacement?.message}>
                <Select id="p-placement" invalid={Boolean(errors.adPlacement)} {...register("adPlacement")}>
                  <option value="">Pick a place</option>
                  <option value="HERO">Family app: home banner</option>
                  <option value="INLINE">Family app: end of the shop</option>
                  <option value="STRIP">Family app: offer bar on a child&apos;s page</option>
                </Select>
              </Field>
              {placement === "HERO" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field id="p-headline" label="Headline">
                      <Input id="p-headline" placeholder="SMASH HARDER" {...register("adHeadline")} />
                    </Field>
                    <Field id="p-highlight" label="Yellow words">
                      <Input id="p-highlight" placeholder="THIS SEASON" {...register("adHighlight")} />
                    </Field>
                  </div>
                  <Field id="p-copy" label="Extra line" hint="Shown after the price">
                    <Input id="p-copy" placeholder="free stringing for RKS players." {...register("adCopy")} />
                  </Field>
                  <div className="space-y-2">
                    <p className={fieldLabel}>Banner image</p>
                    {adImage && <img src={adImage} alt="Banner" className="h-24 w-full rounded-xl object-cover" />}
                    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-4 font-semibold hover:bg-surface">
                      <ImagePlus className="h-5 w-5 text-primary" aria-hidden />
                      {adImage ? "Replace banner" : "Upload a wide banner"}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => upload(e.target.files?.[0], "banner")} />
                    </label>
                  </div>
                </>
              )}
            </>
          )}
        </fieldset>
      </form>
    </Sheet>
  );
}
