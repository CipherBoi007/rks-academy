"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft, Pencil } from "lucide-react";
import { ProductDetail, RelatedProducts } from "@/components/domain/ProductDetailView";
import { ProductSheet } from "@/components/domain/sheets/ProductSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState, LoadingRegion, Skeleton } from "@/components/ui/States";
import { useCanSeeFees, useProduct, useRelatedProducts } from "@/lib/queries";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number(use(params).id);
  const product = useProduct(id);
  const related = useRelatedProducts(id);
  const isOwner = useCanSeeFees();
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/store" className="inline-flex min-h-11 items-center gap-2 font-medium text-primary">
          <ArrowLeft className="h-5 w-5" aria-hidden /> Back to store
        </Link>
        {isOwner && product.data && (
          <Button variant="secondary" icon={<Pencil className="h-4 w-4" aria-hidden />} onClick={() => setEditing(true)}>
            Edit product
          </Button>
        )}
      </div>
      {isOwner && product.data && <ProductSheet open={editing} onClose={() => setEditing(false)} product={product.data} />}
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
          <RelatedProducts products={related.data} hrefBase="/store" />
        </>
      )}
    </>
  );
}
