import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { TagLabel } from "@/components/ui/Chip";
import { CATEGORY_LABEL, inr } from "@/lib/format";
import { isUpload } from "@/lib/images";
import type { Product } from "@/lib/types";

export function ProductMeta({ product }: { product: Product }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-eyebrow text-primary">
      {product.brand} · {CATEGORY_LABEL[product.category]}
    </p>
  );
}

export function RatingPill({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-semibold text-ink ${className ?? ""}`}>
      <Star className="h-3.5 w-3.5 fill-accent text-ink" aria-hidden />
      {rating.toFixed(1)}
      <span className="sr-only">out of 5</span>
    </span>
  );
}

export function Price({ price, mrp, size = "md" }: { price: number; mrp: number; size?: "md" | "lg" }) {
  return (
    <p className="flex flex-wrap items-baseline gap-2">
      <span className={`font-display font-bold ${size === "lg" ? "text-[40px] leading-none text-primary sm:text-[44px]" : "text-lg sm:text-[22px]"}`}>
        {inr(price)}
      </span>
      {mrp > price && (
        <span className={`text-muted line-through ${size === "lg" ? "text-lg" : "text-xs sm:text-sm"}`}>
          <span className="sr-only">MRP </span>
          {inr(mrp)}
        </span>
      )}
    </p>
  );
}

/** hrefBase: "/store" in the staff app, "/family/shop" in the family portal. */
export function ProductCard({ product, hrefBase = "/store" }: { product: Product; hrefBase?: string }) {
  return (
    <Link
      href={`${hrefBase}/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition-shadow hover:shadow-hard-primary"
    >
      <div className="relative aspect-square bg-surface">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            unoptimized={isUpload(product.images[0])}
            className="object-cover"
          />
        )}
        {product.tagLabel && <TagLabel className="absolute left-2.5 top-2.5 sm:left-3 sm:top-3">{product.tagLabel}</TagLabel>}
        {!product.active && (
          <span className="absolute right-2.5 top-2.5 rounded-md bg-ink px-2 py-1 text-[11px] font-bold uppercase text-white">Archived</span>
        )}
        {product.rating !== null && <RatingPill rating={product.rating} className="absolute bottom-2.5 right-2.5" />}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <ProductMeta product={product} />
        <h3 className="line-clamp-2 text-[15px] font-medium leading-snug sm:text-base">{product.name}</h3>
        <div className="mt-auto pt-1">
          <Price price={product.price} mrp={product.mrp} />
        </div>
      </div>
    </Link>
  );
}
