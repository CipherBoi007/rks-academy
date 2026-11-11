import { NextResponse } from "next/server";
import { BACKEND_KEY_HEADER, BACKEND_URL, setSession, crossSite, unavailable } from "@/lib/server/session";

// A sleeping API host can take most of a minute to wake; give the function long enough to wait for it.
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = crossSite(req);
  if (blocked) return blocked;
  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
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

  // The token stays server-side; the page only learns who signed in.
  const res = NextResponse.json({ mustChangePin: body.mustChangePin, user: body.user });
  setSession(res, body.token, body.expiresAt);
  return res;
}
