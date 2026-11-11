import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { FamilyLoginForm } from "./FamilyLoginForm";

export const metadata: Metadata = { title: "Family sign in" };

export default function FamilyLoginPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-white md:flex-row">
      <section className="relative h-[32vh] min-h-[220px] overflow-hidden bg-navy md:h-auto md:min-h-dvh md:w-1/2">
        <Image src="/demo/banners/login-court.jpg" alt="" fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/70 to-navy" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 md:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">RKS Academy · For families</p>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase leading-[0.95] text-white md:text-6xl">
            Every rally, <span className="text-accent">in your pocket.</span>
          </h1>
          <p className="mt-4 hidden max-w-md text-lg text-white/80 md:block">
            Attendance, skill progress, fees and receipts for your child, from the academy.
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-start justify-center px-4 py-8 md:items-center md:px-8 md:py-12">
        <div className="w-full max-w-[400px]">
          <div className="text-center">
            <Image
              src="/brand/crest.png"
              alt="Raja Kumaran Sethupathi Sports Academy crest"
              width={160}
              height={160}
              priority
              className="mx-auto h-20 w-20 md:h-[160px] md:w-[160px]"
            />
            <h2 className="mt-4 font-display text-[26px] font-bold uppercase leading-tight md:text-[32px]">Parent sign in</h2>
            <p className="mt-1 text-muted">Use the mobile number you gave the academy.</p>
          </div>
          <Suspense>
            <FamilyLoginForm />
          </Suspense>
          <p className="mt-8 text-center text-sm text-muted">
            Academy staff?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Staff sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
