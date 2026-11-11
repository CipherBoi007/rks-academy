"use client";

import { useState } from "react";
import { Plus, ShoppingBag } from "lucide-react";
import { ProductCard } from "@/components/domain/ProductCard";
import { ProductSheet } from "@/components/domain/sheets/ProductSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/Controls";
import { PageHeader } from "@/components/ui/PageHeader";
import { PillGroup } from "@/components/ui/Pills";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/States";
import { CATEGORY_LABEL } from "@/lib/format";
import { useCanSeeFees, useProducts } from "@/lib/queries";
import type { ProductCategory } from "@/lib/types";
import { useDebounced } from "@/lib/useDebounced";

type CategoryFilter = ProductCategory | "ALL";

export default function StorePage() {
  const isOwner = useCanSeeFees();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const search = useDebounced(q.trim());
  const products = useProducts({
    q: search || undefined,
    category: category === "ALL" ? undefined : category,
    includeInactive: isOwner && showArchived ? true : undefined,
  });
  const list = products.data?.pages.flatMap((p) => p.content) ?? [];

  return (
    <>
      <PageHeader
        eyebrow="RKS Pro Shop · Academy prices"
        title="Store"
        actions={
          isOwner && (
            <>
              <Button variant="secondary" aria-pressed={showArchived} onClick={() => setShowArchived((v) => !v)}>
                {showArchived ? "Hide archived" : "Show archived"}
              </Button>
              <Button icon={<Plus className="h-5 w-5" aria-hidden />} onClick={() => setAdding(true)}>
                Add product
              </Button>
            </>
          )
        }
      />
      <SearchInput
        label="Search the store"
        placeholder="Search rackets, shuttles, shoes…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
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
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
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
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {list.map((p) => (
                <ProductCard key={p.id} product={p} />
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
      {isOwner && <ProductSheet open={adding} onClose={() => setAdding(false)} />}
    </>
  );
}
