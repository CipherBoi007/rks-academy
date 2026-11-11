"use client";

import { use } from "react";
import { ReceiptView } from "@/components/domain/ReceiptView";
import { useFamilyReceipt } from "@/lib/family";

/** A parent's printable receipt (only for their own children's payments). */
export default function FamilyReceiptPage({ params }: { params: Promise<{ yy: string; n: string }> }) {
  const { yy, n } = use(params);
  return <ReceiptView receipt={useFamilyReceipt(yy, n)} backHref="/family" backLabel="Home" />;
}
