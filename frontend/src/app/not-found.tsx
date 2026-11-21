import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="mt-2 font-display text-5xl font-bold uppercase">Out of court</h1>
      <p className="mt-2 max-w-sm text-muted">That page doesn&apos;t exist. It may have moved, or the link is wrong.</p>
      <ButtonLink href="/dashboard" className="mt-6">
        Back to dashboard
      </ButtonLink>
    </main>
  );
}
