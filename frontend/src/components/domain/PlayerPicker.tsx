"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import type { PlayerSummary } from "@/lib/types";

/** A searchable player combobox ("Aravind Murugan · RKS101"), filtering by name or code as you type. */
export function PlayerPicker({
  id,
  players,
  value,
  onChange,
  invalid,
}: {
  id: string;
  players: PlayerSummary[];
  value: number | null;
  onChange: (id: number) => void;
  invalid?: boolean;
}) {
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const selected = players.find((p) => p.id === value) ?? null;
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    const list = q ? players.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) : players;
    return list.slice(0, 50);
  }, [players, text]);

  function choose(p: PlayerSummary) {
    onChange(p.id);
    setText("");
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (matches.length ? (h + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length : 0));
    } else if (e.key === "Enter" && open && matches[highlight]) {
      e.preventDefault();
      choose(matches[highlight]);
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    }
  }

  const label = selected ? `${selected.name} · ${selected.code}` : "";

  return (
    <div className="relative">
      <input
        ref={input}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[highlight] ? `${listId}-${matches[highlight].id}` : undefined}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        placeholder={label || "Search by name or ID"}
        value={open ? text : label}
        onFocus={() => {
          setOpen(true);
          setHighlight(0);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={onKeyDown}
        className="h-12 w-full rounded-xl border border-line bg-white pl-3.5 pr-10 text-[15px] placeholder:text-ink ios:text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 aria-[invalid=true]:border-alert"
      />
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-sheet"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted">No players match “{text}”</li>
          ) : (
            matches.map((p, i) => (
              <li
                key={p.id}
                id={`${listId}-${p.id}`}
                role="option"
                aria-selected={p.id === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(p)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5",
                  i === highlight && "bg-surface",
                )}
              >
                <Avatar name={p.name} initials={p.initials} photoUrl={p.photoUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate text-[15px]">{p.name}</span>
                <span className="text-sm text-muted">{p.code}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
