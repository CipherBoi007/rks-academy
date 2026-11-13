"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, MessageCircle, Smartphone } from "lucide-react";
import { OneTimePinSheet } from "@/components/domain/OneTimePinSheet";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatMobile } from "@/lib/format";
import { keys, useParentLogin } from "@/lib/queries";
import type { IssuedParentPin, ParentLogin } from "@/lib/types";

/**
 * Owner only: the parent's sign-in to the family portal. The owner issues a one-time PIN here (also the fix for a
 * forgotten PIN) and passes it on in person, by phone or from their own WhatsApp, so the academy pays nothing.
 */
export function ParentLoginCard({ playerId }: { playerId: number }) {
  const login = useParentLogin(playerId);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [issued, setIssued] = useState<IssuedParentPin | null>(null);

  const issue = useMutation({
    mutationFn: () => api<IssuedParentPin>(`/players/${playerId}/parent-login/pin`, { method: "POST" }),
    onSuccess: (res) => {
      queryClient.setQueryData(keys.parentLogin(playerId), res.login);
      setIssued(res);
    },
    onError: (e) => toast({ tone: "error", title: "Couldn't create the PIN", description: errorMessage(e) }),
  });

  if (!login.data) return login.isError ? null : <Skeleton className="mt-6 h-24 rounded-2xl" />;
  const status = describe(login.data);

  return (
    <Card className="mt-6 flex flex-wrap items-center gap-4 p-5 sm:p-6">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary">
        <Smartphone className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          Parent app
          <Chip className={status.chip}>{status.label}</Chip>
        </p>
        <p className="text-sm text-muted">
          {login.data.parentName} · {formatMobile(login.data.mobile)} · {status.detail}
        </p>
      </div>
      <Button
        variant={login.data.hasPin ? "secondary" : "primary"}
        className="max-sm:w-full"
        icon={<KeyRound className="h-4 w-4" aria-hidden />}
        loading={issue.isPending}
        onClick={() => issue.mutate()}
      >
        {login.data.hasPin ? "Reset PIN" : "Create PIN"}
      </Button>

      <OneTimePinSheet
        pin={issued?.temporaryPin ?? null}
        description={issued ? `For ${issued.login.parentName} · ${formatMobile(issued.login.mobile)}` : ""}
        onClose={() => setIssued(null)}
      >
        {issued && (
          <>
            <a
              href={whatsAppLink(issued)}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonClass({ variant: "secondary" }), "w-full")}
            >
              <MessageCircle className="h-4 w-4" aria-hidden /> Send from my WhatsApp
            </a>
            <p className="text-[15px] text-muted">
              The parent signs in at <span className="font-medium text-ink">{familyUrl()}</span> with their mobile number
              and this PIN, then chooses their own. Brothers and sisters share one sign-in. Any earlier PIN has stopped
              working. This PIN won&apos;t be shown again; use Reset PIN if it&apos;s lost.
            </p>
          </>
        )}
      </OneTimePinSheet>
    </Card>
  );
}

function describe(login: ParentLogin): { label: string; chip: string; detail: string } {
  if (!login.hasPin) return { label: "Not set up", chip: "bg-chip text-muted", detail: "No PIN yet" };
  if (login.mustChangePin) {
    return { label: "PIN not used yet", chip: "bg-alert-50 text-alert-700", detail: "Waiting for first sign-in" };
  }
  return {
    label: "Active",
    chip: "bg-primary-50 text-primary",
    detail: login.lastLoginAt ? `Last signed in ${formatDate(login.lastLoginAt.slice(0, 10))}` : "Signed in",
  };
}

function familyUrl() {
  return `${window.location.host}/family`;
}

/** Opens the owner's own WhatsApp with the message ready; nothing goes through the academy's paid number. */
function whatsAppLink(issued: IssuedParentPin) {
  const text =
    `Vanakkam! Your RKS Academy parent app PIN is ${issued.temporaryPin}. ` +
    `Open ${window.location.origin}/family, sign in with this mobile number and the PIN, then choose your own PIN.`;
  return `https://wa.me/91${issued.login.mobile}?text=${encodeURIComponent(text)}`;
}
