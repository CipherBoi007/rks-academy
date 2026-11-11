import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignInLayout } from "@/components/domain/SignInLayout";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <SignInLayout
      eyebrow="Est. Ramanathapuram"
      headline={
        <>
          Train hard. <span className="text-accent">Play proud.</span>
        </>
      }
      tagline="4 courts · 6 batches · 3 coaches — one place to run the academy."
      title="Raja Kumaran Sethupathi Sports Academy"
      subtitle="Ramanathapuram · Admin console"
      footer={
        <>
          Parent of an RKS player?{" "}
          <Link href="/family/login" className="font-semibold text-primary hover:underline">
            Sign in to the family app
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </SignInLayout>
  );
}
