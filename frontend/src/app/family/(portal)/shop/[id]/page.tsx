"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { ProductDetail, RelatedProducts } from "@/components/domain/ProductDetailView";
import { Card } from "@/components/ui/Card";
import { ErrorState, LoadingRegion, Skeleton } from "@/components/ui/States";
import { useShopProduct, useShopRelated } from "@/lib/family";

export default function FamilyProductPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number(use(params).id);
  const product = useShopProduct(id);
  const related = useShopRelated(id);

  return (
    <>
      <Link href="/family/shop" className="mb-5 inline-flex min-h-11 items-center gap-2 font-medium text-primary">
        <ArrowLeft className="h-5 w-5" aria-hidden /> Back to shop
      </Link>
      {product.isError ? (
        <Card>
          <ErrorState error={product.error} onRetry={() => product.refetch()} />
        </Card>
      ) : !product.data ? (
        <LoadingRegion label="Loading product">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Skeleton className="aspect-square rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </LoadingRegion>
      ) : (
        <>
          <ProductDetail key={product.data.id} product={product.data} />
          <RelatedProducts products={related.data} hrefBase="/family/shop" />
        </>
      )}
    </>
  );
}
