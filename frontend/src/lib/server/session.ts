import "server-only";
import type { NextResponse } from "next/server";

/** Staff (owner/coach) session. */
export const SESSION_COOKIE = "rks_session";
/** Family (parent) session: a separate cookie, so the two can never be confused or mixed. */
export const FAMILY_COOKIE = "rks_family";

export const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:8080").replace(/\/$/, "");

/**
 * Sent with every call to the API. When the API is on the public internet (e.g. Render), it answers only requests
 * carrying this shared key, so only this web app can reach it. Unset locally, where the API isn't exposed.
 */
export const BACKEND_KEY_HEADER: Record<string, string> = process.env.BACKEND_PROXY_KEY
  ? { "x-rks-proxy-key": process.env.BACKEND_PROXY_KEY }
  : {};

/** Stores a JWT in an httpOnly cookie, so page scripts can never read it. */
export function setCookieToken(res: NextResponse, name: string, token: string, expiresAt: string) {
  res.cookies.set(name, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export function setSession(res: NextResponse, token: string, expiresAt: string) {
  setCookieToken(res, SESSION_COOKIE, token, expiresAt);
}

export function clearCookie(res: NextResponse, name: string) {
  res.cookies.set(name, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function clearSession(res: NextResponse) {
  clearCookie(res, SESSION_COOKIE);
}

/**
 * Rejects state-changing requests sent from another site. SameSite=Lax cookies already block most cross-site
 * requests; this closes the rest (older browsers, same-site subdomains). Requests without an Origin header come
 * from non-browser clients, which can't carry the user's cookie anyway.
 */
export function crossSite(req: Request): Response | null {
  if (req.method === "GET" || req.method === "HEAD") return null;
  const origin = req.headers.get("origin");
  if (!origin) return null;
  const host = req.headers.get("host");
  try {
    if (new URL(origin).host === host) return null;
  } catch {
    /* malformed Origin: reject below */
  }
  return Response.json({ status: 403, code: "CROSS_SITE", message: "Request blocked" }, { status: 403 });
}

/** A JSON error in the backend's ApiError shape, for when the backend itself can't be reached. */
export function unavailable() {
  return Response.json(
    { status: 503, code: "BACKEND_UNAVAILABLE", message: "The academy server is not reachable. Try again shortly." },
    { status: 503 },
  );
}
