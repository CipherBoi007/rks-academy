"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Tag, X } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { TagLabel } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { useShopAd } from "@/lib/family";
import { inr } from "@/lib/format";
import { isUpload } from "@/lib/images";
import type { AdPlacement, Product } from "@/lib/types";

type Variant = "hero" | "inline" | "strip";

const PLACEMENT: Record<Variant, AdPlacement> = { hero: "HERO", inline: "INLINE", strip: "STRIP" };
const SHOP = "/family/shop";

/**
 * A pro-shop offer, shown only in the family portal (never in the staff app). The owner chooses the product and
 * placement in the shop editor. At most one per screen; only the strip can be dismissed, remembered per session.
 */
export function ProductAd({ variant }: { variant: Variant }) {
  const { data: product } = useShopAd(PLACEMENT[variant]);
  const dismissKey = product ? `rks:ad:${variant}:${product.id}` : null;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!dismissKey) return;
    try {
      setDismissed(sessionStorage.getItem(dismissKey) === "1");
    } catch {
      /* storage unavailable: show the ad */
    }
  }, [dismissKey]);

  if (!product || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      if (dismissKey) sessionStorage.setItem(dismissKey, "1");
    } catch {
      /* ignore */
    }
  }

  if (variant === "hero") return <HeroAd product={product} />;
  if (variant === "inline") return <InlineAd product={product} />;
  return <StripAd product={product} onDismiss={dismiss} />;
}

function discountLabel(p: Product) {
  return p.tagLabel ?? (p.discountPct > 0 ? `${p.discountPct}% off` : null);
}

/** Navy banner: the offer on the left, the product itself on the right so the banner never looks empty. */
function HeroAd({ product }: { product: Product }) {
  const tag = discountLabel(product);
  const photo = product.images[0];
  return (
    <section aria-label="RKS Pro Shop offer" className="relative overflow-hidden rounded-2xl bg-navy">
      {product.ad?.image && (
        <Image
          src={product.ad.image}
          alt=""
          fill
          sizes="100vw"
          unoptimized={isUpload(product.ad.image)}
          className="object-cover opacity-30"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-primary/40" aria-hidden />
      <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/40 blur-3xl" aria-hidden />

      <div className="relative grid grid-cols-[minmax(0,1fr)_96px] items-center gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_200px] sm:gap-8 sm:p-8 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {tag && <TagLabel className="rounded-full px-3">{tag}</TagLabel>}
            <span className="text-[11px] font-bold uppercase tracking-eyebrow text-white/70">RKS Pro Shop</span>
          </div>
          <h2 className="mt-3 font-display text-[28px] font-bold uppercase leading-[0.95] text-white sm:text-[44px]">
            {product.ad?.headline ?? product.name}{" "}
            {product.ad?.highlight && <span className="text-accent">{product.ad.highlight}</span>}
          </h2>
          <p className="mt-3 text-[15px] text-white/85 sm:text-lg">
            {product.brand} {product.name} at <strong className="text-white">{inr(product.price)}</strong>{" "}
            {product.mrp > product.price && <s className="text-white/55">{inr(product.mrp)}</s>}
            {product.ad?.copy ? ` · ${product.ad.copy}` : ""}
          </p>
          <Link
            href={`${SHOP}/${product.id}`}
            className={cn(buttonClass({ variant: "accent", size: "lg" }), "mt-5 hidden sm:inline-flex")}
          >
            Shop now <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>
        {photo && (
          <div className="relative aspect-square rotate-3 overflow-hidden rounded-2xl shadow-sheet ring-4 ring-white/15">
            <Image src={photo} alt={product.name} fill sizes="(min-width: 640px) 240px, 96px" unoptimized={isUpload(photo)} className="object-cover" />
          </div>
        )}
        <Link href={`${SHOP}/${product.id}`} className={cn(buttonClass({ variant: "accent", size: "lg" }), "col-span-2 w-full sm:hidden")}>
          Shop now <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function InlineAd({ product }: { product: Product }) {
  return (
    <Link
      href={`${SHOP}/${product.id}`}
      className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-line bg-white p-3 pr-4 shadow-card transition-shadow hover:shadow-hard-primary sm:p-4"
    >
      {product.tagLabel && <TagLabel className="absolute right-0 top-0 rounded-none rounded-bl-xl">{product.tagLabel}</TagLabel>}
      {product.images[0] && (
        <Image
          src={product.images[0]}
          alt=""
          width={96}
          height={96}
          unoptimized={isUpload(product.images[0])}
          className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24"
        />
      )}
      <div className="min-w-0 flex-1 pt-3 sm:pt-0">
        <p className="text-[11px] font-bold uppercase tracking-eyebrow text-muted">From the RKS Pro Shop</p>
        <p className="mt-1 line-clamp-2 font-display text-lg font-semibold uppercase leading-tight sm:text-2xl">{product.name}</p>
        <p className="mt-1 font-semibold text-primary">
          {inr(product.price)} {product.mrp > product.price && <s className="font-normal text-muted">{inr(product.mrp)}</s>}
        </p>
      </div>
      <ArrowRight className="h-6 w-6 shrink-0 text-primary" aria-hidden />
      <span className="sr-only">View product</span>
    </Link>
  );
}

function StripAd({ product, onDismiss }: { product: Product; onDismiss: () => void }) {
  const tag = discountLabel(product);
  return (
    <aside aria-label="RKS Pro Shop offer" className="flex items-center gap-3 rounded-2xl border border-ink bg-white p-2.5 shadow-card sm:p-3">
      <Link href={`${SHOP}/${product.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-alert text-white" aria-hidden>
          <Tag className="h-5 w-5" />
        </span>
        <span className="truncate text-[15px] text-muted">
          {tag && <strong className="font-semibold uppercase text-ink">{tag}</strong>}
          {tag && " · "}
          {product.brand} {product.name} at {inr(product.price)}
        </span>
      </Link>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-surface"
        aria-label="Dismiss offer"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
    </aside>
  );
}
