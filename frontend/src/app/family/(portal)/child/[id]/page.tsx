"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { ProductAd } from "@/components/domain/ProductAd";
import { AttendanceCard, FeeTimeline, ProfileHeader, ProfileInfoCards, SkillsCard } from "@/components/domain/profile";
import { Card } from "@/components/ui/Card";
import { ErrorState, LoadingRegion, Skeleton } from "@/components/ui/States";
import { useFamilyAttendance, useFamilyChild, useFamilyDue, useFamilyPayments, useFamilyProgress } from "@/lib/family";
import { useConfig } from "@/lib/queries";

/** A parent's view of one child: the same profile the academy sees, read-only, with their fee history. */
export default function FamilyChildPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number(use(params).id);
  const { data: config } = useConfig();
  const child = useFamilyChild(id);
  const progress = useFamilyProgress(id);
  const payments = useFamilyPayments(id);
  const due = useFamilyDue(id);

  return (
    <>
      <Link href="/family" className="mb-5 inline-flex min-h-11 items-center gap-2 font-medium text-primary">
        <ArrowLeft className="h-5 w-5" aria-hidden /> Home
      </Link>
      {child.isError ? (
        <Card>
          <ErrorState error={child.error} onRetry={() => child.refetch()} />
        </Card>
      ) : !child.data ? (
        <LoadingRegion label="Loading">
          <Skeleton className="h-56 rounded-2xl" />
        </LoadingRegion>
      ) : (
        <>
          <ProfileHeader player={child.data} />
          <ProfileInfoCards player={child.data} siblingHref={(sid) => `/family/child/${sid}`} />
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
            <AttendanceCard
              playerId={id}
              joinDate={child.data.joinDate}
              today={config?.today}
              useAttendance={useFamilyAttendance}
              className="lg:col-span-3"
            />
            <SkillsCard query={progress} className="lg:col-span-2" />
          </div>
          <FeeTimeline
            payments={payments}
            due={due.data}
            receiptHref={(no) => `/family/receipts/${no.split("/").slice(1).join("/")}`}
          />
          <div className="mt-6">
            <ProductAd variant="strip" />
          </div>
        </>
      )}
    </>
  );
}
