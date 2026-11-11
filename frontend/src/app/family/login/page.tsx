import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarCheck, ReceiptText, TrendingUp } from "lucide-react";
import { SignInLayout } from "@/components/domain/SignInLayout";
import { FamilyLoginForm } from "./FamilyLoginForm";

export const metadata: Metadata = { title: "Family sign in" };

const HIGHLIGHTS = [
  { icon: CalendarCheck, label: "Attendance" },
  { icon: TrendingUp, label: "Skill progress" },
  { icon: ReceiptText, label: "Fees & receipts" },
];

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
        <FamilyLoginForm intro={<Highlights />} />
      </Suspense>
    </SignInLayout>
  );
}

/** What parents get, so the first screen explains itself. */
function Highlights() {
  return (
    <div className="mt-6 short:mt-4 tall:mt-8 md:mt-8">
      <p className="text-center text-[11px] font-bold uppercase tracking-eyebrow text-muted">What you&apos;ll see</p>
      <ul className="mt-3 grid grid-cols-3 gap-2 short:mt-2">
        {HIGHLIGHTS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex flex-col items-center gap-2 rounded-xl bg-surface px-2 py-3 text-center short:py-2.5 tall:py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-xs font-semibold leading-tight text-ink">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
