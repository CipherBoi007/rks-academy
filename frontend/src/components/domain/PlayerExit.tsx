"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import { keys } from "@/lib/queries";
import type { PlayerDetail } from "@/lib/types";

/** Lists, dues, reminders and the dashboard all change when a player leaves, rejoins or is deleted. */
const AFFECTED = [keys.players, keys.summary, keys.dues, keys.payments, keys.reminders];

function useRefresh() {
  const queryClient = useQueryClient();
  return () => AFFECTED.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
}

/** Owner only, on a player who has left: they're off every list but their history is kept, and they can rejoin. */
export function LeftBanner({ player }: { player: PlayerDetail }) {
  const toast = useToast();
  const refresh = useRefresh();
  const rejoin = useMutation({
    mutationFn: () => api<PlayerDetail>(`/players/${player.id}/rejoin`, { method: "POST" }),
    onSuccess: (p) => {
      refresh();
      toast({ title: `${p.name} rejoined`, description: `Same player ID ${p.code}, with their history.` });
    },
    onError: (e) => toast({ tone: "error", title: "Couldn't rejoin", description: errorMessage(e) }),
  });
  return (
    <Card className="mb-6 flex flex-col gap-3 border-alert/40 bg-alert-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-alert-700">{player.name} has left the academy</p>
        <p className="text-sm text-alert-700">
          Not in lists, attendance, dues or reminders. Payments, receipts and attendance are kept.
        </p>
      </div>
      <Button
        variant="secondary"
        className="shrink-0"
        icon={<RotateCcw className="h-4 w-4" aria-hidden />}
        loading={rejoin.isPending}
        onClick={() => rejoin.mutate()}
      >
        Rejoin
      </Button>
    </Card>
  );
}

/**
 * Owner only, at the foot of a current player's profile. "Mark as left" keeps their history; "Delete" is offered
 * only while nothing is on record (a player added by mistake). Both ask first.
 */
export function LeaveOrDelete({ player }: { player: PlayerDetail }) {
  const [confirm, setConfirm] = useState<"leave" | "delete" | null>(null);
  return (
    <Card className="mt-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <p className="font-semibold">Leaving the academy?</p>
        <p className="text-sm text-muted">
          {player.deletable
            ? "Mark them as left, or delete them if they were added by mistake (nothing is on record yet)."
            : "Mark them as left. Their payments, receipts and attendance are kept."}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {player.deletable && (
          <Button variant="ghost" className="text-alert-700" icon={<Trash2 className="h-4 w-4" aria-hidden />} onClick={() => setConfirm("delete")}>
            Delete player
          </Button>
        )}
        <Button variant="secondary" icon={<LogOut className="h-4 w-4" aria-hidden />} onClick={() => setConfirm("leave")}>
          Mark as left
        </Button>
      </div>
      <ConfirmSheet player={player} action={confirm} onClose={() => setConfirm(null)} />
    </Card>
  );
}

function ConfirmSheet({ player, action, onClose }: { player: PlayerDetail; action: "leave" | "delete" | null; onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const refresh = useRefresh();
  const run = useMutation({
    mutationFn: () =>
      action === "delete"
        ? api(`/players/${player.id}`, { method: "DELETE" })
        : api<PlayerDetail>(`/players/${player.id}/leave`, { method: "POST" }),
    onSuccess: () => {
      refresh();
      if (action === "delete") {
        toast({ title: `${player.name} deleted` });
        router.replace("/players");
      } else {
        toast({ title: `${player.name} marked as left`, description: "Find them under Players → Left, and rejoin any time." });
        // The button sits at the foot of the profile; bring the "has left" banner into view.
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      onClose();
    },
    onError: (e) => toast({ tone: "error", title: action === "delete" ? "Couldn't delete" : "Couldn't mark as left", description: errorMessage(e) }),
  });
  const deleting = action === "delete";
  return (
    <Sheet
      open={action !== null}
      onClose={onClose}
      title={deleting ? "Delete player" : "Mark as left"}
      description={`${player.name} · ${player.code}`}
      footer={
        <Button
          variant={deleting ? "danger" : "primary"}
          size="lg"
          className="w-full"
          loading={run.isPending}
          icon={deleting ? <Trash2 className="h-5 w-5" aria-hidden /> : <LogOut className="h-5 w-5" aria-hidden />}
          onClick={() => run.mutate()}
        >
          {deleting ? "Delete for good" : "Mark as left"}
        </Button>
      }
    >
      <p className="text-[15px]">
        {deleting
          ? "The player and their profile are removed completely. This can't be undone. Use it only for a player added by mistake."
          : `${player.name} will be removed from player lists, attendance, pending dues and fee reminders, and their family-app sign-in stops unless someone else uses the same number. Their payments, receipts and attendance are kept, and you can rejoin them later.`}
      </p>
    </Sheet>
  );
}
