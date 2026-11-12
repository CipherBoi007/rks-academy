"use client";

import { useRef, useState } from "react";
import { SlidersHorizontal, UserPlus, Users } from "lucide-react";
import { PlayerCard } from "@/components/domain/PlayerRows";
import { PlayerSheet } from "@/components/domain/sheets/PlayerSheet";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/Controls";
import { Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pager, useMobilePager } from "@/components/ui/Pager";
import { PillGroup } from "@/components/ui/Pills";
import { Sheet } from "@/components/ui/Sheet";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { LEVEL_LABEL, LEVELS } from "@/lib/format";
import { useBatches, useCanSeeFees, useCourts, useDashboardSummary, usePlayers, type PlayerFilters } from "@/lib/queries";
import type { FeeStatus, Level } from "@/lib/types";
import { useDebounced } from "@/lib/useDebounced";

type FeeFilter = FeeStatus | "ALL";
type LevelFilter = Level | "ALL";

interface Filters {
  batchId: number | "";
  courtId: number | "";
  fee: FeeFilter;
  level: LevelFilter;
}

const EMPTY: Filters = { batchId: "", courtId: "", fee: "ALL", level: "ALL" };

export default function PlayersPage() {
  const canEdit = useCanSeeFees();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const search = useDebounced(q.trim());

  const query: PlayerFilters = {
    q: search || undefined,
    batchId: filters.batchId || undefined,
    courtId: filters.courtId || undefined,
    feeStatus: filters.fee === "ALL" ? undefined : filters.fee,
    level: filters.level === "ALL" ? undefined : filters.level,
  };
  const players = usePlayers(query);
  const summary = useDashboardSummary();
  const batches = useBatches();
  const list = players.data?.pages.flatMap((p) => p.content) ?? [];
  const total = players.data?.pages[0]?.totalElements ?? 0;
  const activeFilterCount = [filters.batchId, filters.courtId, filters.fee !== "ALL", filters.level !== "ALL"].filter(Boolean).length;
  const listTop = useRef<HTMLDivElement>(null);
  const pager = useMobilePager({
    total,
    loaded: list.length,
    loadMore: () => players.fetchNextPage(),
    resetKey: JSON.stringify(query),
    anchor: listTop,
  });

  return (
    <>
      <PageHeader
        eyebrow={`${summary.data?.activePlayers ?? "–"} enrolled · ${batches.data?.length ?? "–"} batches`}
        title="Players"
        inlineActions
        actions={
          canEdit && (
            // Very narrow phones: just the add-person icon.
            <Button
              icon={<UserPlus className="h-5 w-5" aria-hidden />}
              onClick={() => setAdding(true)}
              className="max-[359px]:w-11 max-[359px]:px-0"
            >
              <span className="max-[359px]:sr-only">Add player</span>
            </Button>
          )
        }
      />

      <Card className="p-3 sm:p-5">
        <div className="flex gap-3">
          <SearchInput
            label="Search players"
            placeholder="Search by name or ID (e.g. RKS105)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="secondary"
            className="md:hidden"
            icon={<SlidersHorizontal className="h-5 w-5" aria-hidden />}
            onClick={() => setFiltersOpen(true)}
          >
            Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
          </Button>
        </div>
        <div className="hidden md:block">
          <FilterControls filters={filters} onChange={setFilters} layout="inline" />
        </div>
      </Card>

      <p className="mb-3 mt-5 text-[15px] text-muted" aria-live="polite">
        Showing <strong className="text-ink">{total}</strong> {total === 1 ? "player" : "players"}
      </p>

      {players.isError ? (
        <Card>
          <ErrorState error={players.error} onRetry={() => players.refetch()} />
        </Card>
      ) : !players.data ? (
        <LoadingRegion label="Loading players">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }, (_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-2xl" />
            ))}
          </div>
        </LoadingRegion>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-6 w-6" aria-hidden />}
            title="No players found"
            message="Try a different name or ID, or clear the filters."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQ("");
                  setFilters(EMPTY);
                }}
              >
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div ref={listTop} className="grid scroll-mt-24 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((p, i) => (
              // display:contents keeps the desktop grid exactly as before; phones hide cards off the current page.
              <div key={p.id} className={cn("contents", pager.itemClass(i))}>
                <PlayerCard player={p} />
              </div>
            ))}
          </div>
          <Pager pager={pager} label="Players" />
          {players.hasNextPage && (
            <div className="mt-5 flex justify-center max-md:hidden">
              <Button variant="secondary" loading={players.isFetchingNextPage} onClick={() => players.fetchNextPage()}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setFilters(EMPTY)}>
              Reset
            </Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              Show {total} players
            </Button>
          </div>
        }
      >
        <FilterControls filters={filters} onChange={setFilters} layout="stacked" />
      </Sheet>

      {canEdit && <PlayerSheet open={adding} onClose={() => setAdding(false)} />}
    </>
  );
}

function FilterControls({
  filters,
  onChange,
  layout,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  layout: "inline" | "stacked";
}) {
  const courts = useCourts();
  const batches = useBatches();
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value });
  const stacked = layout === "stacked";

  return (
    <div className={stacked ? "space-y-5" : "mt-3 space-y-3"}>
      <div className={stacked ? "space-y-3" : "flex flex-wrap items-center gap-3"}>
        <Select
          aria-label="Batch"
          value={filters.batchId}
          onChange={(e) => set("batchId", e.target.value ? Number(e.target.value) : "")}
          className={stacked ? "" : "w-64"}
        >
          <option value="">All batches</option>
          {batches.data?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Court"
          value={filters.courtId}
          onChange={(e) => set("courtId", e.target.value ? Number(e.target.value) : "")}
          className={stacked ? "" : "w-56"}
        >
          <option value="">All courts</option>
          {courts.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <PillGroup<FeeFilter>
          label="Fee status"
          value={filters.fee}
          onChange={(v) => set("fee", v)}
          options={[
            { value: "ALL", label: "Any fee status" },
            { value: "PAID", label: "Paid" },
            { value: "DUE", label: "Due" },
          ]}
        />
      </div>
      <div className="flex items-center gap-3">
        {!stacked && <SlidersHorizontal className="h-5 w-5 shrink-0 text-muted" aria-hidden />}
        <PillGroup<LevelFilter>
          label="Level"
          value={filters.level}
          onChange={(v) => set("level", v)}
          options={[{ value: "ALL", label: "All levels" }, ...LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))]}
        />
      </div>
    </div>
  );
}
