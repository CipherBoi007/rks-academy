"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/** Clears the session cookie and every cached query, then does a full reload to the login page. */
export function useSignOut() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    queryClient.clear();
    window.location.assign("/login");
  }, [queryClient]);
}
