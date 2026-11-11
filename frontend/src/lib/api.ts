import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: { field: string; message: string }[];

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.status = body.status;
    this.code = body.code;
    this.fieldErrors = body.fieldErrors ?? [];
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface Options {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

function toSearch(query?: Query): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

function redirect(to: string) {
  if (typeof window === "undefined") return;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`${to}?next=${next}`);
}

/** An expired or revoked token: drop the cookie first, or middleware would bounce the login page back here. */
async function signOutAndRedirect(family: boolean) {
  await fetch(family ? "/api/family-auth/logout" : "/api/auth/logout", { method: "POST" }).catch(() => undefined);
  redirect(family ? "/family/login" : "/login");
}

/**
 * Calls the backend through this app's same-origin /api/v1 proxy, which attaches the session token.
 * Signed-out and pending-PIN-change responses redirect; everything else non-2xx throws ApiError.
 */
export async function api<T>(path: string, { method = "GET", body, query, signal }: Options = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(`/api/v1${path}${toSearch(query)}`, {
    method,
    signal,
    headers: body === undefined || isForm ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const err = new ApiError(
      data && typeof data === "object" && "code" in data
        ? (data as ApiErrorBody)
        : { status: res.status, code: "HTTP_" + res.status, message: "Something went wrong. Please try again." },
    );
    if (err.status === 401) await signOutAndRedirect(path.startsWith("/family"));
    if (err.code === "PIN_CHANGE_REQUIRED") redirect("/change-pin");
    throw err;
  }
  return data as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return "Can't reach the server. Check your connection.";
  return "Something went wrong. Please try again.";
}
