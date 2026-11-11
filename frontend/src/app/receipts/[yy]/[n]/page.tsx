"use client";

import { use } from "react";
import { ReceiptView } from "@/components/domain/ReceiptView";
import { useReceipt } from "@/lib/queries";

/** Staff receipt view, outside the app shell so printing gives just the receipt. */
export default function ReceiptPage({ params }: { params: Promise<{ yy: string; n: string }> }) {
  const { yy, n } = use(params);
  return <ReceiptView receipt={useReceipt(yy, n)} backHref="/fees" backLabel="Fees" />;
}
