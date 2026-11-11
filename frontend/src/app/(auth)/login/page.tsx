import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-white md:flex-row">
      {/* Image panel: a short banner on phones, half the screen from md up. */}
      <section className="relative h-[35vh] min-h-[220px] overflow-hidden bg-navy md:h-auto md:min-h-dvh md:w-1/2">
        <Image
          src="/demo/banners/login-court.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/70 to-navy" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 md:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Est. Ramanathapuram</p>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase leading-[0.95] text-white md:text-6xl">
            Train hard. <span className="text-accent">Play proud.</span>
          </h1>
          <p className="mt-4 hidden max-w-md text-lg text-white/80 md:block">
            4 courts · 6 batches · 3 coaches — one place to run the academy.
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-start justify-center px-4 py-8 md:items-center md:px-8 md:py-12">
        <div className="w-full max-w-[400px]">
          <div className="text-center">
            <Image
              src="/brand/crest.png"
              alt="Raja Kumaran Sethupathi Sports Academy crest"
              width={190}
              height={190}
              priority
              className="mx-auto h-24 w-24 md:h-[190px] md:w-[190px]"
            />
            <h2 className="mt-4 font-display text-[22px] font-bold uppercase leading-tight md:text-[32px]">
              Raja Kumaran Sethupathi Sports Academy
            </h2>
            <p className="mt-1 text-muted">Ramanathapuram · Admin console</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
          <p className="mt-8 text-center text-sm text-muted">
            Parent of an RKS player?{" "}
            <Link href="/family/login" className="font-semibold text-primary hover:underline">
              Sign in to the family app
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
