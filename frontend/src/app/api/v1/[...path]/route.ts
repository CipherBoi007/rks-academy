import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { BACKEND_KEY_HEADER, BACKEND_URL, FAMILY_COOKIE, SESSION_COOKIE, crossSite, unavailable } from "@/lib/server/session";

// A sleeping API host can take most of a minute to wake; give the function long enough to wait for it.
export const maxDuration = 60;

/**
 * Same-origin proxy to the Spring Boot API. It attaches the session token from the httpOnly cookie, so the
 * browser never handles the JWT: the family cookie for /family/* endpoints and the staff cookie for everything
 * else, never both. Sign-in goes through /api/auth and /api/family-auth instead, because those set cookies.
 */
async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const blocked = crossSite(req);
  if (blocked) return blocked;
  const { path } = await params;
  const token = (await cookies()).get(path[0] === "family" ? FAMILY_COOKIE : SESSION_COOKIE)?.value;

  const headers = new Headers(BACKEND_KEY_HEADER);
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/v1/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      cache: "no-store",
    });
  } catch {
    return unavailable();
  }

  // Not content-length: fetch transparently un-gzips the body, so the upstream length would be wrong.
  const out = new Headers();
  for (const name of ["content-type", "cache-control", "content-disposition", "x-content-type-options"]) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  return new Response(upstream.status === 204 ? null : upstream.body, { status: upstream.status, headers: out });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
