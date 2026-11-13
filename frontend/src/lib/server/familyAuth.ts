import "server-only";
import { NextResponse } from "next/server";
import { BACKEND_KEY_HEADER, BACKEND_URL, FAMILY_COOKIE, crossSite, setCookieToken, unavailable } from "./session";

/**
 * Forwards a family sign-in (`login` or `set-pin`) to the API and keeps the session it returns in its own httpOnly
 * cookie. A one-time PIN signs nothing in: the API answers `mustChangePin` with no token, and so does this.
 */
export async function familyAuth(req: Request, action: "login" | "set-pin") {
  const blocked = crossSite(req);
  if (blocked) return blocked;
  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/v1/family/auth/${action}`, {
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

  const res = NextResponse.json({ mustChangePin: Boolean(body.mustChangePin) });
  if (body.token) setCookieToken(res, FAMILY_COOKIE, body.token, body.expiresAt);
  return res;
}
