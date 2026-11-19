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
      aside={<Highlights />}
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

/** What parents get, as chips on the photo (md and up), so the sign-in side fits one screen. */
function Highlights() {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="What you'll see">
      {HIGHLIGHTS.map(({ icon: Icon, label }) => (
        <li key={label} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur">
          <Icon className="h-4 w-4 text-accent" aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  );
}
