"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, createContext, useContext, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Download, FileText, Plus, Send } from "lucide-react";
import { OwnerOnly } from "@/components/domain/OwnerOnly";
import { DueRow } from "@/components/domain/PlayerRows";
import { RecordPaymentSheet, receiptHref } from "@/components/domain/sheets/RecordPaymentSheet";
import { VoidPaymentSheet } from "@/components/domain/sheets/VoidPaymentSheet";
import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ModeChip } from "@/components/ui/Chip";
import { KpiCard } from "@/components/ui/KpiCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PillGroup } from "@/components/ui/Pills";
import { Pager, useMobilePager } from "@/components/ui/Pager";
import { Popover } from "@/components/ui/Popover";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { addDays, formatDate, formatMonth, inr } from "@/lib/format";
import { keys, useConfig, useDues, usePayments, usePaymentsSummary, useReminderStatus, type PaymentFilters } from "@/lib/queries";
import type { Payment, PaymentMode, ReminderRun } from "@/lib/types";

type Tab = "collections" | "pending" | "history";
const TABS: Tab[] = ["collections", "pending", "history"];

/** Smaller header buttons on phones so Export, Fee structure and Record payment fit on one line. */
const PHONE_COMPACT = "max-sm:gap-1.5 max-sm:px-2.5 max-sm:text-[13px]";

export default function FeesPage() {
  return (
    <OwnerOnly>
      <Suspense>
        <Fees />
      </Suspense>
    </OwnerOnly>
  );
}

function Fees() {
  const router = useRouter();
  const params = useSearchParams();
  const tabParam = params.get("tab") as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : "collections";
  const [recording, setRecording] = useState<{ open: boolean; playerId?: number }>({ open: false });
  const [voiding, setVoiding] = useState<Payment | null>(null);
  const summary = usePaymentsSummary();
  const s = summary.data;

  function setTab(t: Tab) {
    router.replace(t === "collections" ? "/fees" : `/fees?tab=${t}`, { scroll: false });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Collections & dues"
        title="Fees"
        // Phones: all three on one line, slightly tighter.
        actionsClassName="max-sm:flex-nowrap max-sm:gap-2"
        actions={
          <>
            <ExportMenu />
            <ButtonLink href="/fee-structure" variant="secondary" className={PHONE_COMPACT}>
              Fee structure
            </ButtonLink>
            <Button
              icon={<Plus className="h-5 w-5 max-sm:h-4 max-sm:w-4" aria-hidden />}
              onClick={() => setRecording({ open: true })}
              className={cn(PHONE_COMPACT, "max-sm:flex-1")}
            >
              Record payment
            </Button>
          </>
        }
      />

      {summary.isError ? (
        <Card>
          <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <KpiCard compact label="Collected" loading={!s} value={s && inr(s.collected)} meta={s && `${formatMonth(s.month + "-01")} · ${s.paymentCount} payments`} />
          <KpiCard compact tone="alert" label="Pending" loading={!s} value={s && inr(s.pending)} meta={s && `${s.dueCount} players`} />
          <div className="col-span-2 sm:col-span-1">
            <KpiCard compact tone="primary" label="Via UPI" loading={!s} value={s && `${s.upiPct}%`} meta={s && `${inr(s.upiAmount)} this month`} />
          </div>
        </div>
      )}

      <div className="scrollbar-none relative -mx-4 mt-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <SegmentedTabs<Tab>
          label="Fee views"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "collections", label: "Collections" },
            { value: "pending", label: `Pending${s ? ` (${s.dueCount})` : ""}` },
            { value: "history", label: "History" },
          ]}
          className="min-w-max sm:min-w-0"
        />
      </div>

      <VoidContext.Provider value={setVoiding}>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-4">
          {tab === "collections" && <Collections />}
          {tab === "pending" && <Pending onCollect={(playerId) => setRecording({ open: true, playerId })} />}
          {tab === "history" && <History />}
        </div>
      </VoidContext.Provider>

      <RecordPaymentSheet open={recording.open} playerId={recording.playerId} onClose={() => setRecording({ open: false })} />
      <VoidPaymentSheet payment={voiding} onClose={() => setVoiding(null)} />
    </div>
  );
}

function Collections() {
  const { data: config } = useConfig();
  const today = config?.today;
  const filters: PaymentFilters = { from: today ? `${today.slice(0, 7)}-01` : undefined, to: today };
  const payments = usePayments(filters, Boolean(today));
  return <PaymentsView query={payments} emptyMessage="No fees collected this month yet." />;
}

function History() {
  const [mode, setMode] = useState<PaymentMode | "ALL">("ALL");
  const payments = usePayments({ mode: mode === "ALL" ? undefined : mode });
  return (
    <>
      <PillGroup<PaymentMode | "ALL">
        label="Payment mode"
        className="mb-4"
        value={mode}
        onChange={setMode}
        options={[
          { value: "ALL", label: "All modes" },
          { value: "UPI", label: "UPI" },
          { value: "CASH", label: "Cash" },
        ]}
      />
      <PaymentsView key={mode} query={payments} emptyMessage="No payments recorded yet." />
    </>
  );
}

function PaymentsView({ query, emptyMessage }: { query: ReturnType<typeof usePayments>; emptyMessage: string }) {
  const rows = query.data?.pages.flatMap((p) => p.content) ?? [];
  const listTop = useRef<HTMLUListElement>(null);
  const pager = useMobilePager({
    total: query.data?.pages[0]?.totalElements ?? 0,
    loaded: rows.length,
    loadMore: () => query.fetchNextPage(),
    anchor: listTop,
  });
  if (query.isError) {
    return (
      <Card>
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </Card>
    );
  }
  if (!query.data) {
    return (
      <LoadingRegion label="Loading payments">
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </LoadingRegion>
    );
  }
  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState title="Nothing here yet" message={emptyMessage} />
      </Card>
    );
  }
  return (
    <>
      <PaymentsTable rows={rows} />
      {/* Phones: 10 cards per page. The table (md and up) keeps Load more. */}
      <ul ref={listTop} className="scroll-mt-24 space-y-3 md:hidden">
        {rows.slice(pager.start, pager.end).map((p) => (
          <PaymentCard key={p.id} payment={p} />
        ))}
      </ul>
      <Pager pager={pager} label="Payments" />
      {query.hasNextPage && (
        <div className="mt-4 flex justify-center max-md:hidden">
          <Button variant="secondary" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
            Load more
          </Button>
        </div>
      )}
    </>
  );
}

/** Opens the void sheet for a payment; provided by the Fees page. */
const VoidContext = createContext<(payment: Payment) => void>(() => undefined);

function PaymentActions({ payment }: { payment: Payment }) {
  const onVoid = useContext(VoidContext);
  return (
    <span className="inline-flex items-center gap-1">
      <ReceiptLink payment={payment} />
      {!payment.voided && (
        <button
          type="button"
          onClick={() => onVoid(payment)}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-alert-700 hover:bg-alert-50"
          aria-label={`Void receipt ${payment.receiptNo}`}
        >
          <Ban className="h-4 w-4" aria-hidden /> Void
        </button>
      )}
    </span>
  );
}

function Amount({ payment: p }: { payment: Payment }) {
  if (!p.voided) return <span className="font-display text-xl font-bold text-primary">{inr(p.amount)}</span>;
  return (
    <span className="inline-flex flex-col items-end" title={p.voidReason ?? undefined}>
      <s className="font-display text-xl font-bold text-muted">{inr(p.amount)}</s>
      <span className="text-[11px] font-bold uppercase tracking-wide text-alert-700">Voided</span>
    </span>
  );
}

function ReceiptLink({ payment }: { payment: Payment }) {
  return (
    <Link
      href={receiptHref(payment.receiptNo)}
      target="_blank"
      className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary hover:underline"
      aria-label={`Receipt ${payment.receiptNo}`}
    >
      <FileText className="h-4 w-4" aria-hidden /> Receipt
    </Link>
  );
}

function PaymentsTable({ rows }: { rows: Payment[] }) {
  return (
    <Card className="hidden overflow-hidden md:block">
      <table className="w-full text-left text-[15px]">
        <thead className="bg-surface text-ink/80">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Player</th>
            <th scope="col" className="px-4 py-3 font-medium">Receipt</th>
            <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">Plan</th>
            <th scope="col" className="px-4 py-3 font-medium">Date</th>
            <th scope="col" className="px-4 py-3 font-medium">Mode</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Receipt link</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-2.5">
                <Link href={`/players/${p.player.id}`} className="flex items-center gap-3 font-semibold hover:underline">
                  <Avatar name={p.player.name} initials={p.player.initials} photoUrl={p.player.photoUrl} size="sm" />
                  {p.player.name}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-muted">{p.receiptNo}</td>
              <td className="hidden px-4 py-2.5 lg:table-cell">{p.plan.name}</td>
              <td className="whitespace-nowrap px-4 py-2.5">{formatDate(p.paidOn)}</td>
              <td className="px-4 py-2.5">
                <ModeChip mode={p.mode} />
              </td>
              <td className="px-4 py-2.5 text-right">
                <Amount payment={p} />
              </td>
              <td className="whitespace-nowrap px-4 py-1 text-right">
                <PaymentActions payment={p} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function PaymentCard({ payment: p }: { payment: Payment }) {
  return (
    <li className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-center gap-3">
        <Avatar name={p.player.name} initials={p.player.initials} photoUrl={p.player.photoUrl} size="md" />
        <div className="min-w-0 flex-1">
          <Link href={`/players/${p.player.id}`} className="block truncate font-semibold">
            {p.player.name}
          </Link>
          <p className="text-sm text-muted">
            {p.plan.name} · {formatDate(p.paidOn)}
          </p>
        </div>
        <Amount payment={p} />
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-1">
        <span className="flex items-center gap-2 text-sm text-muted">
          <ModeChip mode={p.mode} /> {p.receiptNo}
        </span>
        <PaymentActions payment={p} />
      </div>
    </li>
  );
}

function Pending({ onCollect }: { onCollect: (playerId: number) => void }) {
  const dues = useDues();
  const listTop = useRef<HTMLUListElement>(null);
  const count = dues.data?.content.length ?? 0;
  const pager = useMobilePager({ total: count, loaded: count, anchor: listTop });
  return (
    <div className="space-y-4">
      <RemindersPanel />
      {dues.isError ? (
        <Card>
          <ErrorState error={dues.error} onRetry={() => dues.refetch()} />
        </Card>
      ) : !dues.data ? (
        <LoadingRegion label="Loading dues">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </LoadingRegion>
      ) : dues.data.content.length === 0 ? (
        <Card>
          <EmptyState title="All paid up" message="Every active player's current fee period is covered." />
        </Card>
      ) : (
        <div>
          <ul ref={listTop} className="scroll-mt-24 space-y-3">
            {dues.data.content.map((d, i) => (
              <DueRow
                key={d.player.id}
                due={d}
                className={pager.itemClass(i)}
                action={
                  <Button variant="secondary" className="ml-1 px-3" onClick={() => onCollect(d.player.id)}>
                    Collect
                  </Button>
                }
              />
            ))}
          </ul>
          <Pager pager={pager} label="Pending dues" />
        </div>
      )}
    </div>
  );
}

/** Month-start WhatsApp reminders: sent automatically on the 1st; this sends any that are still outstanding. */
function RemindersPanel() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const status = useReminderStatus(true);
  const send = useMutation({
    mutationFn: () => api<ReminderRun>("/notifications/fee-reminders", { method: "POST" }),
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: keys.reminders });
      toast({
        tone: run.failed > 0 ? "error" : "success",
        title: run.sent > 0 ? `${run.sent} WhatsApp reminders sent` : "No new reminders to send",
        description:
          `${run.eligible} players owe this month's fee` +
          (run.alreadySent ? ` · ${run.alreadySent} were already reminded` : "") +
          (run.failed ? ` · ${run.failed} failed` : ""),
      });
    },
    onError: (e) => toast({ tone: "error", title: "Couldn't send reminders", description: errorMessage(e) }),
  });

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">WhatsApp fee reminders</p>
        <p className="text-sm text-muted">
          Sent automatically on the 1st of each month to parents with an unpaid new period.
          {status.data && ` This month: ${status.data.sent} sent${status.data.failed ? `, ${status.data.failed} failed` : ""}.`}
        </p>
      </div>
      <Button variant="secondary" icon={<Send className="h-4 w-4" aria-hidden />} loading={send.isPending} onClick={() => send.mutate()}>
        Send now
      </Button>
    </Card>
  );
}

/** CSV downloads for the accountant. The browser saves them; the proxy passes the file name through. */
function ExportMenu() {
  const { data: config } = useConfig();
  if (!config) return null;
  const thisMonth = `${config.today.slice(0, 7)}-01`;
  const lastMonthEnd = addDays(thisMonth, -1);
  const lastMonth = `${lastMonthEnd.slice(0, 7)}-01`;
  const files = [
    { label: `Payments · ${formatMonth(thisMonth)}`, href: `/api/v1/exports/payments.csv?from=${thisMonth}&to=${config.today}` },
    { label: `Payments · ${formatMonth(lastMonth)}`, href: `/api/v1/exports/payments.csv?from=${lastMonth}&to=${lastMonthEnd}` },
    { label: "Pending dues", href: "/api/v1/exports/dues.csv" },
    { label: "All players", href: "/api/v1/exports/players.csv" },
    { label: `Attendance · ${formatMonth(thisMonth)}`, href: `/api/v1/exports/attendance.csv?from=${thisMonth}&to=${config.today}` },
  ];
  return (
    <Popover
      label="Export"
      // On phones Export is the leftmost button, so the menu opens to the right of it.
      className="max-sm:left-0 max-sm:right-auto"
      trigger={({ open, toggle, id }) => (
        <Button
          variant="secondary"
          icon={<Download className="h-4 w-4" aria-hidden />}
          // Narrow phones (360px): just the download icon, so the three buttons still fit on one line.
          className={cn(PHONE_COMPACT, "max-[379px]:w-11 max-[379px]:px-0")}
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
        >
          <span className="max-[379px]:sr-only">Export</span>
        </Button>
      )}
    >
      {(close) => (
        <>
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Download as CSV (Excel)</p>
          {files.map((f) => (
            <a
              key={f.href}
              href={f.href}
              download
              role="menuitem"
              onClick={close}
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium hover:bg-surface"
            >
              <Download className="h-4 w-4 text-primary" aria-hidden /> {f.label}
            </a>
          ))}
        </>
      )}
    </Popover>
  );
}
