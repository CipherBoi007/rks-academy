"use client";

import Image from "next/image";
import { useState } from "react";
import { MessageCircle, Package, ShieldCheck, Star, Truck } from "lucide-react";
import { Price, ProductCard, ProductMeta } from "@/components/domain/ProductCard";
import { buttonClass } from "@/components/ui/Button";
import { TagLabel } from "@/components/ui/Chip";
import { fieldLabel } from "@/components/ui/Field";
import { PillGroup } from "@/components/ui/Pills";
import { cn } from "@/lib/cn";
import { inr } from "@/lib/format";
import { isUpload } from "@/lib/images";
import { useConfig } from "@/lib/queries";
import type { Product } from "@/lib/types";

/** Stock at or below this shows an "Only N left" nudge. */
const LOW_STOCK = 10;

/** Product detail, shared by the staff store and the family shop. */
export function ProductDetail({ product }: { product: Product }) {
  const { data: config } = useConfig();
  const [image, setImage] = useState(0);
  const [variants, setVariants] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.variants.map((g) => [g.name, g.values[0]])),
  );

  const chosen = Object.entries(variants).map(([group, value]) => `${group}: ${value}`).join(", ");
  const message = `Vanakkam! I'd like to enquire about ${product.brand} ${product.name}${chosen ? ` (${chosen})` : ""} at ${inr(product.price)} from the RKS Pro Shop.`;
  const whatsapp = config ? `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}` : undefined;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-surface">
          {product.images[image] && (
            <Image
              src={product.images[image]}
              alt={product.name}
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              unoptimized={isUpload(product.images[image])}
              className="object-cover"
            />
          )}
          {product.tagLabel && <TagLabel className="absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs">{product.tagLabel}</TagLabel>}
        </div>
        {product.images.length > 1 && (
          <div className="scrollbar-none relative mt-3 flex snap-x gap-3 overflow-x-auto p-1" role="group" aria-label="Product photos">
            {product.images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setImage(i)}
                aria-label={`Photo ${i + 1} of ${product.images.length}`}
                aria-pressed={i === image}
                className={cn(
                  "relative h-20 w-20 shrink-0 snap-start overflow-hidden rounded-xl sm:h-24 sm:w-24",
                  i === image ? "ring-2 ring-primary ring-offset-2" : "ring-1 ring-line",
                )}
              >
                <Image src={src} alt="" fill sizes="96px" unoptimized={isUpload(src)} className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <ProductMeta product={product} />
        <h1 className="mt-2 font-display text-[34px] font-bold uppercase leading-none sm:text-[40px]">{product.name}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[15px] text-muted">
          {product.rating !== null && (
            <span className="inline-flex items-center gap-1 font-semibold text-ink">
              <Star className="h-4 w-4 fill-accent text-ink" aria-hidden /> {product.rating.toFixed(1)}
            </span>
          )}
          {product.reviewCount > 0 && <span>· {product.reviewCount} reviews</span>}
          {product.stock !== null && product.stock <= LOW_STOCK && (
            <span className="font-semibold text-alert-700">· {product.stock === 0 ? "Out of stock" : `Only ${product.stock} left`}</span>
          )}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Price price={product.price} mrp={product.mrp} size="lg" />
          {product.savings > 0 && (
            <span className="rounded-full border border-ink/70 bg-accent px-3 py-1 text-sm font-bold">Save {inr(product.savings)}</span>
          )}
        </div>
        {product.description && <p className="mt-4 text-base text-muted">{product.description}</p>}

        {product.variants.map((group) => (
          <div key={group.name} className="mt-5">
            <p className={cn(fieldLabel, "mb-2")}>{group.name}</p>
            <PillGroup<string>
              label={group.name}
              value={variants[group.name]}
              onChange={(v) => setVariants((s) => ({ ...s, [group.name]: v }))}
              options={group.values.map((v) => ({ value: v, label: v }))}
            />
          </div>
        ))}

        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!whatsapp}
          className={cn(
            buttonClass({ size: "lg" }),
            "mt-6 w-full",
            // Sticky above the tab bar on phones so the call to action is always in reach.
            "sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 md:static",
          )}
        >
          <MessageCircle className="h-5 w-5" aria-hidden /> Enquire on WhatsApp
        </a>

        <ul className="mt-4 grid grid-cols-3 gap-3">
          {[
            { icon: Package, text: "Pick up at academy" },
            { icon: ShieldCheck, text: "100% genuine" },
            { icon: Truck, text: "Ramnad delivery" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex flex-col items-center gap-1.5 rounded-xl bg-white/70 px-2 py-3 text-center text-[13px] text-muted ring-1 ring-line">
              <Icon className="h-5 w-5 text-primary" aria-hidden />
              {text}
            </li>
          ))}
        </ul>

        {product.specs.length > 0 && (
          <dl className="mt-5 overflow-hidden rounded-2xl border border-line bg-white">
            {product.specs.map((s, i) => (
              <div key={s.label} className={cn("flex justify-between gap-4 px-5 py-3.5", i % 2 === 1 && "bg-surface")}>
                <dt className="text-muted">{s.label}</dt>
                <dd className="text-right font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

export function RelatedProducts({ products, hrefBase }: { products?: Product[]; hrefBase: string }) {
  if (!products?.length) return null;
  return (
    <section className="mt-10" aria-labelledby="related-title">
      <h2 id="related-title" className="font-display text-2xl font-bold uppercase">
        You may also like
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} hrefBase={hrefBase} />
        ))}
      </div>
    </section>
  );
}
