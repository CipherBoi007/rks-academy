"use client";

import { useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

/** Phones show long lists 10 at a time. md and up keep the full list (with Load more), so desktop is unchanged. */
export const MOBILE_PAGE_SIZE = 10;

export interface MobilePager {
  page: number;
  pages: number;
  start: number;
  end: number;
  total: number;
  loading: boolean;
  go: (page: number) => void;
  /** Classes for the item at this index: hidden on phones when it isn't on the current page. */
  itemClass: (index: number) => string | undefined;
}

/**
 * Pages over a list that may still be loading in chunks from the API. Moving to a page past what's loaded calls
 * loadMore first. The page goes back to 1 whenever resetKey changes (e.g. new search or filters).
 */
export function useMobilePager({
  total,
  loaded,
  loadMore,
  resetKey = "",
  anchor,
}: {
  total: number;
  loaded: number;
  loadMore?: () => Promise<unknown>;
  resetKey?: string;
  /** Scrolled into view after a page change, so the new page starts at its top. */
  anchor?: RefObject<HTMLElement | null>;
}): MobilePager {
  const [state, setState] = useState({ key: resetKey, page: 0 });
  const [loading, setLoading] = useState(false);
  const pages = Math.max(1, Math.ceil(total / MOBILE_PAGE_SIZE));
  const page = Math.min(state.key === resetKey ? state.page : 0, pages - 1);
  const start = page * MOBILE_PAGE_SIZE;
  const end = start + MOBILE_PAGE_SIZE;

  async function go(next: number) {
    if (next < 0 || next >= pages || loading) return;
    if (Math.min(total, (next + 1) * MOBILE_PAGE_SIZE) > loaded && loadMore) {
      setLoading(true);
      try {
        await loadMore();
      } finally {
        setLoading(false);
      }
    }
    setState({ key: resetKey, page: next });
    anchor?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return {
    page,
    pages,
    start,
    end,
    total,
    loading,
    go,
    itemClass: (i) => (i >= start && i < end ? undefined : "max-md:hidden"),
  };
}

/** Previous / next with "11–20 of 34". Phones only; renders nothing for a single page. */
export function Pager({ pager, label }: { pager: MobilePager; label: string }) {
  if (pager.pages <= 1) return null;
  const { page, pages, start, total, loading, go } = pager;
  return (
    <nav aria-label={`${label} pages`} className="mt-4 flex items-center justify-between gap-3 md:hidden">
      <Button
        variant="secondary"
        className="px-3"
        disabled={page === 0}
        onClick={() => go(page - 1)}
        icon={<ChevronLeft className="h-5 w-5" aria-hidden />}
      >
        Prev
      </Button>
      <p className="text-center text-sm text-muted" aria-live="polite">
        <strong className="text-ink">
          {start + 1}–{Math.min(start + MOBILE_PAGE_SIZE, total)}
        </strong>{" "}
        of {total}
        <span className="block text-xs">
          Page {page + 1} of {pages}
        </span>
      </p>
      <Button
        variant="secondary"
        className="px-3"
        disabled={page >= pages - 1}
        loading={loading}
        onClick={() => go(page + 1)}
        trailingIcon={loading ? undefined : <ChevronRight className="h-5 w-5" aria-hidden />}
      >
        Next
      </Button>
    </nav>
  );
}
