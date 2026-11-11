import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { BACKEND_KEY_HEADER, BACKEND_URL, SESSION_COOKIE, setSession, crossSite, unavailable } from "@/lib/server/session";

// A sleeping API host can take most of a minute to wake; give the function long enough to wait for it.
export const maxDuration = 60;

/** Changing the PIN returns a fresh token (the old one may be a short-lived "change PIN first" token). */
export async function POST(req: Request) {
  const blocked = crossSite(req);
  if (blocked) return blocked;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/v1/auth/change-pin`, {
      method: "POST",
      headers: { ...BACKEND_KEY_HEADER, "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: await req.text(),
      cache: "no-store",
    });
  } catch {
    return unavailable();
  }
  const body = await upstream.json();
  if (!upstream.ok) return NextResponse.json(body, { status: upstream.status });

  const res = NextResponse.json({ mustChangePin: body.mustChangePin, user: body.user });
  setSession(res, body.token, body.expiresAt);
  return res;
}
