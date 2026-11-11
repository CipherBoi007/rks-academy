"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { ProductAd } from "@/components/domain/ProductAd";
import { ProductCard } from "@/components/domain/ProductCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/Controls";
import { PageHeader } from "@/components/ui/PageHeader";
import { PillGroup } from "@/components/ui/Pills";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/States";
import { useShopProducts } from "@/lib/family";
import { CATEGORY_LABEL } from "@/lib/format";
import type { ProductCategory } from "@/lib/types";
import { useDebounced } from "@/lib/useDebounced";

type CategoryFilter = ProductCategory | "ALL";

/** The RKS Pro Shop for families: academy prices, enquiries on WhatsApp. */
export default function FamilyShopPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const search = useDebounced(q.trim());
  const products = useShopProducts(search || undefined, category === "ALL" ? undefined : category);
  const list = products.data?.pages.flatMap((p) => p.content) ?? [];

  return (
    <>
      <PageHeader eyebrow="RKS Pro Shop · Academy prices" title="Shop" />
      <SearchInput label="Search the shop" placeholder="Search rackets, shuttles, shoes…" value={q} onChange={(e) => setQ(e.target.value)} />
      <PillGroup<CategoryFilter>
        label="Category"
        scroll
        className="mt-4"
        value={category}
        onChange={setCategory}
        options={[
          { value: "ALL", label: "All" },
          ...(Object.keys(CATEGORY_LABEL) as ProductCategory[]).map((c) => ({ value: c, label: CATEGORY_LABEL[c] })),
        ]}
      />
      <div className="mt-5">
        {products.isError ? (
          <Card>
            <ErrorState error={products.error} onRetry={() => products.refetch()} />
          </Card>
        ) : !products.data ? (
          <LoadingRegion label="Loading products">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: 10 }, (_, i) => (
                <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
              ))}
            </div>
          </LoadingRegion>
        ) : list.length === 0 ? (
          <Card>
            <EmptyState icon={<ShoppingBag className="h-6 w-6" aria-hidden />} title="Nothing matches" message="Try another search or category." />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {list.map((p) => (
                <ProductCard key={p.id} product={p} hrefBase="/family/shop" />
              ))}
            </div>
            {products.hasNextPage && (
              <div className="mt-5 flex justify-center">
                <Button variant="secondary" loading={products.isFetchingNextPage} onClick={() => products.fetchNextPage()}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <div className="mt-6">
        <ProductAd variant="inline" />
      </div>
    </>
  );
}
