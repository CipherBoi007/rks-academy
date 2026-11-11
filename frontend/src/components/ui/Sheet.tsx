"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Every form sheet: a right-side drawer from md up and a bottom sheet on phones. It traps focus, closes on
 * Esc or a backdrop click, locks page scroll and gives focus back to the opener when it closes.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Land on the first field in the body rather than the close button.
    const first =
      panel.current?.querySelector<HTMLElement>(`[data-sheet-body] :is(${FOCUSABLE})`) ??
      panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const [head, tail] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-ink/20 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={
          "absolute inset-x-0 bottom-0 flex max-h-[92dvh] animate-slide-in-up flex-col rounded-t-2xl bg-white pb-safe " +
          "md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] md:animate-slide-in-right md:rounded-none md:border-l md:border-line md:shadow-sheet"
        }
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-line md:hidden" aria-hidden />
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-3 md:pt-6">
          <div>
            <h2 id={titleId} className="font-display text-[26px] font-bold uppercase leading-tight">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-[15px] text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink hover:bg-surface"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <div data-sheet-body className="flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>
        {footer && <footer className="border-t border-line px-5 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
