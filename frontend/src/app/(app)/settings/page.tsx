"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { OwnerOnly } from "@/components/domain/OwnerOnly";
import { CoachesPanel, CourtsAndBatchesPanel } from "@/components/domain/settings/FacilityPanels";
import { StaffPanel } from "@/components/domain/settings/StaffPanel";
import { WhatsAppPanel } from "@/components/domain/settings/WhatsAppPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";

type Tab = "staff" | "courts" | "coaches" | "whatsapp";
const TABS: { value: Tab; label: string }[] = [
  { value: "staff", label: "Staff logins" },
  { value: "courts", label: "Courts & batches" },
  { value: "coaches", label: "Coaches" },
  { value: "whatsapp", label: "WhatsApp" },
];

export default function SettingsPage() {
  return (
    <OwnerOnly>
      <Suspense>
        <Settings />
      </Suspense>
    </OwnerOnly>
  );
}

function Settings() {
  const router = useRouter();
  const param = useSearchParams().get("tab") as Tab | null;
  const tab: Tab = param && TABS.some((t) => t.value === param) ? param : "staff";

  return (
    <>
      <PageHeader title="Settings" />
      <div className="scrollbar-none relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <SegmentedTabs<Tab>
          label="Settings sections"
          value={tab}
          onChange={(t) => router.replace(t === "staff" ? "/settings" : `/settings?tab=${t}`, { scroll: false })}
          tabs={TABS}
          className="min-w-max sm:min-w-0"
        />
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-5">
        {tab === "staff" && <StaffPanel />}
        {tab === "courts" && <CourtsAndBatchesPanel />}
        {tab === "coaches" && <CoachesPanel />}
        {tab === "whatsapp" && <WhatsAppPanel />}
      </div>
    </>
  );
}
