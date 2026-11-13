"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

/**
 * Shows a one-time PIN once, for staff or parent logins. It is never stored in plain text, so it can't be shown
 * again later. `children` explains how to pass it on (and may add a share button).
 */
export function OneTimePinSheet({
  pin,
  description,
  onClose,
  children,
}: {
  pin: string | null;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [pin]);
  if (!pin) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(pin!);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="One-time PIN"
      description={description}
      footer={
        <Button size="lg" className="w-full" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="select-all rounded-2xl border border-ink bg-accent px-4 py-5 text-center font-display text-5xl font-bold tracking-[0.3em]">
          {pin}
        </p>
        <Button variant="secondary" className="w-full" icon={<Copy className="h-4 w-4" aria-hidden />} onClick={copy}>
          {copied ? "Copied" : "Copy PIN"}
        </Button>
        {children}
      </div>
    </Sheet>
  );
}
