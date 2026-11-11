import { NextResponse } from "next/server";
import { BACKEND_KEY_HEADER, BACKEND_URL, FAMILY_COOKIE, crossSite, setCookieToken, unavailable } from "@/lib/server/session";

// A sleeping API host can take most of a minute to wake; give the function long enough to wait for it.
export const maxDuration = 60;

/** Exchanges a WhatsApp sign-in code for a family session, kept in its own httpOnly cookie. */
export async function POST(req: Request) {
  const blocked = crossSite(req);
  if (blocked) return blocked;
  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/v1/family/auth/verify`, {
      method: "POST",
      headers: { ...BACKEND_KEY_HEADER, "content-type": "application/json" },
      body: await req.text(),
      cache: "no-store",
    });
  } catch {
    return unavailable();
  }
  const body = await upstream.json();
  if (!upstream.ok) return NextResponse.json(body, { status: upstream.status });

  const res = NextResponse.json({ ok: true });
  setCookieToken(res, FAMILY_COOKIE, body.token, body.expiresAt);
  return res;
}
