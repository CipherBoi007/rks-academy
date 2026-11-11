import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignInLayout } from "@/components/domain/SignInLayout";
import { FamilyLoginForm } from "./FamilyLoginForm";

export const metadata: Metadata = { title: "Family sign in" };

export default function FamilyLoginPage() {
  return (
    <SignInLayout
      eyebrow="RKS Academy · For families"
      headline={
        <>
          Every rally, <span className="text-accent">in your pocket.</span>
        </>
      }
      tagline="Attendance, skill progress, fees and receipts for your child, from the academy."
      title="Parent sign in"
      subtitle="Use the mobile number you gave the academy."
      footer={
        <>
          Academy staff?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Staff sign in
          </Link>
        </>
      }
    >
      <Suspense>
        <FamilyLoginForm />
      </Suspense>
    </SignInLayout>
  );
}
