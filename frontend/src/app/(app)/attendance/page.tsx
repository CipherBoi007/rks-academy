"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCheck, Save, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { LevelChip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager, usePager } from "@/components/ui/Pager";
import { PillGroup } from "@/components/ui/Pills";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatTimeRange } from "@/lib/format";
import { keys, useAttendanceSheet, useBatches, useConfig, useCourts } from "@/lib/queries";
import type { AttendanceSheet, AttendanceStatus } from "@/lib/types";

type Marks = Record<number, AttendanceStatus>;

export default function AttendancePage() {
  const { data: config } = useConfig();
  const courts = useCourts();
  const [date, setDate] = useState("");
  const [courtId, setCourtId] = useState<number | null>(null);
  const [batchId, setBatchId] = useState<number | null>(null);

  // Default to the business date and the first court once they load.
  useEffect(() => {
    if (config && !date) setDate(config.today);
  }, [config, date]);
  useEffect(() => {
    if (courts.data?.length && courtId === null) setCourtId(courts.data[0].id);
  }, [courts.data, courtId]);

  const batches = useBatches(courtId ?? undefined, date || undefined);
  useEffect(() => {
    if (!batches.data) return;
    if (!batches.data.some((b) => b.id === batchId)) setBatchId(batches.data[0]?.id ?? null);
  }, [batches.data, batchId]);

  const sheet = useAttendanceSheet(date, batchId ?? undefined);

  return (
    <>
      <PageHeader eyebrow="Daily check-in" title="Attendance" />

      <Card className="space-y-5 p-4 sm:p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
          <div className="lg:w-64">
            <StepLabel n={1} label="Date" htmlFor="att-date" />
            <DatePicker id="att-date" label="Attendance date" value={date} max={config?.today} onChange={setDate} />
          </div>
          <div className="min-w-0 flex-1">
            <StepLabel n={2} label="Court" />
            {courts.data ? (
              <PillGroup<number>
                label="Court"
                scroll
                value={courtId ?? 0}
                onChange={setCourtId}
                options={courts.data.map((c) => ({ value: c.id, label: c.name }))}
              />
            ) : (
              <Skeleton className="h-11 w-80" />
            )}
          </div>
        </div>
        <div>
          <StepLabel n={3} label="Batch" />
          {batches.isError ? (
            <ErrorState error={batches.error} onRetry={() => batches.refetch()} />
          ) : !batches.data ? (
            <Skeleton className="h-20" />
          ) : batches.data.length === 0 ? (
            <p className="rounded-xl bg-surface px-4 py-4 text-[15px] text-muted">No sessions on this court that day.</p>
          ) : (
            <div role="radiogroup" aria-label="Batch" className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {batches.data.map((b) => {
                const active = b.id === batchId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setBatchId(b.id)}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-5 py-4 text-left transition-colors",
                      active ? "border-ink bg-primary text-white" : "border-line bg-white hover:bg-surface",
                    )}
                  >
                    <span>
                      <span className="block text-lg font-semibold">{b.name}</span>
                      <span className={cn("block text-sm", active ? "font-medium text-accent" : "text-muted")}>
                        {formatTimeRange(b.startTime, b.endTime)} · Coach {b.coach.name}
                      </span>
                    </span>
                    {active && <Check className="h-6 w-6 shrink-0 text-accent" aria-hidden />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {batchId !== null &&
        (sheet.isError ? (
          <Card className="mt-6">
            <ErrorState error={sheet.error} onRetry={() => sheet.refetch()} />
          </Card>
        ) : !sheet.data ? (
          <LoadingRegion label="Loading roster">
            <div className="mt-6 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[72px] rounded-2xl" />
              ))}
            </div>
          </LoadingRegion>
        ) : (
          <Roster key={`${sheet.data.date}-${sheet.data.batch.id}`} sheet={sheet.data} />
        ))}
    </>
  );
}

function StepLabel({ n, label, htmlFor }: { n: number; label: string; htmlFor?: string }) {
  const content = (
    <>
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white" aria-hidden>
        {n}
      </span>
      {label}
    </>
  );
  const className = "mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink/80";
  return htmlFor ? (
    <label htmlFor={htmlFor} className={className}>
      {content}
    </label>
  ) : (
    <p className={className}>{content}</p>
  );
}

/** Marks start from what was saved. Only players with a mark are sent; the rest stay unmarked. */
function Roster({ sheet }: { sheet: AttendanceSheet }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const saved = useMemo<Marks>(
    () => Object.fromEntries(sheet.entries.filter((e) => e.status).map((e) => [e.player.id, e.status!])),
    [sheet],
  );
  const [marks, setMarks] = useState<Marks>(saved);

  const present = Object.values(marks).filter((s) => s === "PRESENT").length;
  const absent = Object.values(marks).filter((s) => s === "ABSENT").length;
  const unmarked = sheet.entries.length - present - absent;
  const dirty = sheet.entries.some((e) => marks[e.player.id] !== saved[e.player.id]);
  const progress = sheet.entries.length ? ((present + absent) / sheet.entries.length) * 100 : 0;
  const listTop = useRef<HTMLUListElement>(null);
  const pager = usePager({ total: sheet.entries.length, loaded: sheet.entries.length, anchor: listTop });

  const save = useMutation({
    mutationFn: () =>
      api<AttendanceSheet>("/attendance", {
        method: "POST",
        body: {
          date: sheet.date,
          batchId: sheet.batch.id,
          entries: Object.entries(marks).map(([playerId, status]) => ({ playerId: Number(playerId), status })),
        },
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(keys.attendance(sheet.date, sheet.batch.id), updated);
      queryClient.invalidateQueries({ queryKey: keys.summary });
      queryClient.invalidateQueries({ queryKey: keys.players });
      toast({ title: "Attendance saved", description: `${sheet.batch.name}: ${updated.present} present, ${updated.absent} absent` });
    },
    onError: (e) => toast({ tone: "error", title: "Couldn't save attendance", description: errorMessage(e) }),
  });

  if (sheet.entries.length === 0) {
    return (
      <Card className="mt-6">
        <EmptyState title="No players in this batch" message="Add players to this batch from the Players screen." />
      </Card>
    );
  }

  return (
    <>
      <Card outlined className="mt-6 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[15px]" aria-live="polite">
            <span>
              <strong className="font-display text-2xl text-primary">{present}</strong> Present
            </span>
            <span>
              <strong className="font-display text-2xl text-alert">{absent}</strong> Absent
            </span>
            <span>
              <strong className="font-display text-2xl">{unmarked}</strong> Unmarked
            </span>
          </p>
          <Button
            variant="secondary"
            icon={<CheckCheck className="h-5 w-5" aria-hidden />}
            onClick={() => setMarks(Object.fromEntries(sheet.entries.map((e) => [e.player.id, "PRESENT" as const])))}
            aria-label="Mark all present"
          >
            <span className="hidden sm:inline">Mark all present</span>
          </Button>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-surface" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </Card>

      <ul ref={listTop} className="mt-3 scroll-mt-24 space-y-3">
        {pager.slice(sheet.entries).map(({ player }) => (
          <li key={player.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 sm:p-4">
            <Avatar name={player.name} initials={player.initials} photoUrl={player.photoUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold sm:text-lg">{player.name}</p>
              <div className="mt-0.5 flex items-center gap-2 text-sm text-muted">
                {player.code} <LevelChip level={player.level} />
              </div>
            </div>
            <PresenceToggle
              name={player.name}
              value={marks[player.id]}
              onChange={(status) => setMarks((m) => ({ ...m, [player.id]: status }))}
            />
          </li>
        ))}
      </ul>

      <Pager pager={pager} label="Players" />

      {/* At the end of the list, after the last player. */}
      <div className="mt-5">
        <Button
          size="lg"
          className="w-full md:w-auto"
          loading={save.isPending}
          disabled={!dirty}
          icon={<Save className="h-5 w-5" aria-hidden />}
          onClick={() => save.mutate()}
        >
          Save attendance
        </Button>
      </div>
    </>
  );
}

function PresenceToggle({
  name,
  value,
  onChange,
}: {
  name: string;
  value: AttendanceStatus | undefined;
  onChange: (s: AttendanceStatus) => void;
}) {
  const option = "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 px-3 text-[15px] font-medium sm:px-4";
  return (
    <div role="radiogroup" aria-label={`Attendance for ${name}`} className="flex shrink-0 overflow-hidden rounded-xl border border-line">
      <button
        type="button"
        role="radio"
        aria-checked={value === "PRESENT"}
        aria-label="Present"
        onClick={() => onChange("PRESENT")}
        className={cn(option, value === "PRESENT" ? "bg-primary text-white" : "bg-white text-ink hover:bg-surface")}
      >
        <Check className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Present</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "ABSENT"}
        aria-label="Absent"
        onClick={() => onChange("ABSENT")}
        className={cn(option, "border-l border-line", value === "ABSENT" ? "bg-alert text-white" : "bg-white text-ink hover:bg-surface")}
      >
        <X className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Absent</span>
      </button>
    </div>
  );
}
