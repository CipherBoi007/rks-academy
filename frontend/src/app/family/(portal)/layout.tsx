import type { Metadata } from "next";
import { FamilyShell } from "@/components/family/FamilyShell";

export const metadata: Metadata = { title: { default: "Family", template: "%s · RKS Family" } };

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return <FamilyShell>{children}</FamilyShell>;
}
