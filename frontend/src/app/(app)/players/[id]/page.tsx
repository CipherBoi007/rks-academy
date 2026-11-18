"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, Pencil, Phone, ReceiptIndianRupee, SlidersHorizontal } from "lucide-react";
import { ParentLoginCard } from "@/components/domain/ParentLoginCard";
import { AttendanceCard, FeeTimeline, ProfileHeader, ProfileInfoCards, SkillsCard } from "@/components/domain/profile";
import { PlayerSheet } from "@/components/domain/sheets/PlayerSheet";
import { RecordPaymentSheet, receiptHref } from "@/components/domain/sheets/RecordPaymentSheet";
import { SkillsSheet } from "@/components/domain/sheets/SkillsSheet";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState, LoadingRegion, Skeleton } from "@/components/ui/States";
import { api } from "@/lib/api";
import { formatPeriod, inr } from "@/lib/format";
import { useCanSeeFees, useConfig, usePlayer, usePlayerAttendance, usePlayerPayments, usePlayerProgress } from "@/lib/queries";
import type { PlayerDetail, Quote } from "@/lib/types";

export default function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number(use(params).id);
  const canSeeFees = useCanSeeFees();
  const { data: config } = useConfig();
  const player = usePlayer(id);
  const progress = usePlayerProgress(id);
  const [editing, setEditing] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [editingSkills, setEditingSkills] = useState(false);

  return (
    <>
      <Link href="/players" className="mb-5 inline-flex min-h-11 items-center gap-2 font-medium text-primary">
        <ArrowLeft className="h-5 w-5" aria-hidden /> All players
      </Link>

      {player.isError ? (
        <Card>
          <ErrorState error={player.error} onRetry={() => player.refetch()} />
        </Card>
      ) : !player.data ? (
        <LoadingRegion label="Loading player">
          <Skeleton className="h-56 rounded-2xl" />
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        </LoadingRegion>
      ) : (
        <>
          <ProfileHeader
            player={player.data}
            actions={
              <>
                <a href={`tel:+91${player.data.parent.mobile}`} className={buttonClass({ variant: "secondary" })}>
                  <Phone className="h-5 w-5" aria-hidden /> Call parent
                </a>
                <WhatsAppParent player={player.data} withFee={canSeeFees} />
                {canSeeFees && (
                  <>
                    <Button variant="secondary" icon={<Pencil className="h-5 w-5" aria-hidden />} onClick={() => setEditing(true)}>
                      Edit
                    </Button>
                    <Button icon={<ReceiptIndianRupee className="h-5 w-5" aria-hidden />} onClick={() => setCollecting(true)}>
                      Collect fee
                    </Button>
                  </>
                )}
              </>
            }
          />
          <ProfileInfoCards player={player.data} siblingHref={(sid) => `/players/${sid}`} />
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
            <AttendanceCard
              playerId={id}
              joinDate={player.data.joinDate}
              today={config?.today}
              useAttendance={usePlayerAttendance}
              className="lg:col-span-3"
            />
            <SkillsCard
              query={progress}
              className="lg:col-span-2"
              action={
                <Button variant="ghost" icon={<SlidersHorizontal className="h-4 w-4" aria-hidden />} onClick={() => setEditingSkills(true)}>
                  Update
                </Button>
              }
            />
          </div>
          {canSeeFees && <StaffFeeHistory player={player.data} />}
          {canSeeFees && player.data.active && <ParentLoginCard playerId={id} />}

          {progress.data && (
            <SkillsSheet open={editingSkills} onClose={() => setEditingSkills(false)} playerId={id} progress={progress.data} />
          )}
          {canSeeFees && (
            <>
              <PlayerSheet open={editing} onClose={() => setEditing(false)} player={player.data} />
              <RecordPaymentSheet open={collecting} onClose={() => setCollecting(false)} playerId={id} />
            </>
          )}
        </>
      )}
    </>
  );
}

/** The live quote for a current due (owner only); shared by the fee history and the WhatsApp message. */
function useDueQuote(player: PlayerDetail, enabled: boolean) {
  return useQuery({
    queryKey: ["quote", player.id, "profile"],
    queryFn: () => api<Quote>("/payments/quote", { method: "POST", body: { playerId: player.id } }),
    enabled: enabled && player.feeStatus === "DUE" && player.active,
  });
}

/**
 * Opens the user's own WhatsApp with a message to this player's parent already typed. It goes from their phone,
 * not the academy's paid API number, so it costs nothing. For the owner, a due fee is included; coaches never see
 * fee amounts, so theirs is a plain greeting.
 */
function WhatsAppParent({ player, withFee }: { player: PlayerDetail; withFee: boolean }) {
  const due = useDueQuote(player, withFee);
  const quote = player.feeStatus === "DUE" ? due.data : undefined;
  const text = quote
    ? `Vanakkam ${player.parent.name}! Fee reminder from RKS Academy for ${player.name} (${player.code}): ` +
      `${quote.plan.name} fee for ${formatPeriod(quote.periodFrom, quote.periodTo)} is ${inr(quote.total)}. ` +
      `Please pay at the earliest. Thank you!`
    : `Vanakkam ${player.parent.name}! This is RKS Academy about ${player.name} (${player.code}).`;
  return (
    <a
      href={`https://wa.me/91${player.parent.mobile}?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noreferrer"
      className={buttonClass({ variant: "secondary" })}
    >
      <MessageCircle className="h-5 w-5" aria-hidden /> WhatsApp
    </a>
  );
}

/** Owner only: payments plus the live quote for a current due. */
function StaffFeeHistory({ player }: { player: PlayerDetail }) {
  const payments = usePlayerPayments(player.id, true);
  const due = useDueQuote(player, true);
  // A cached quote outlives the due once it's paid, so gate on the live status.
  const current = player.feeStatus === "DUE" ? due.data : undefined;
  return <FeeTimeline payments={payments} due={current} receiptHref={receiptHref} receiptTarget="_blank" />;
}
