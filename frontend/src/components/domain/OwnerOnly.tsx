"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { useMe } from "@/lib/queries";

/** Fee screens are owner-only; coaches who follow a link here get a clear message instead of errors. */
export function OwnerOnly({ children }: { children: ReactNode }) {
  const { data: me } = useMe();
  if (!me) return <Skeleton className="h-64 rounded-2xl" />;
  if (me.role === "OWNER") return <>{children}</>;
  return (
    <Card>
      <EmptyState
        icon={<Lock className="h-6 w-6" aria-hidden />}
        title="Owner only"
        message="Fee details are visible to the academy owner. You can still see each player's Paid / Due status."
        action={<ButtonLink href="/players">Go to players</ButtonLink>}
      />
    </Card>
  );
}
