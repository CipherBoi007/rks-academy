import { NextResponse, type NextRequest } from "next/server";

// Must match lib/server/session.ts (middleware can't import server-only modules).
const STAFF_COOKIE = "rks_session";
const FAMILY_COOKIE = "rks_family";

/**
 * Keeps signed-out visitors on the right sign-in page and signed-in users off it. Staff and family areas are
 * guarded by their own cookies; the API itself enforces access on every request.
 */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isFamily = pathname === "/family" || pathname.startsWith("/family/");
  const signedIn = Boolean(req.cookies.get(isFamily ? FAMILY_COOKIE : STAFF_COOKIE)?.value);
  const loginPath = isFamily ? "/family/login" : "/login";
  const home = isFamily ? "/family" : "/dashboard";
  const isLogin = pathname === loginPath;

  if (!signedIn && !isLogin) {
    const url = new URL(loginPath, req.url);
    if (pathname !== "/" && pathname !== home) url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (signedIn && (isLogin || pathname === "/")) {
    return NextResponse.redirect(new URL(home, req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|demo|brand|favicon.ico|icon.png).*)"],
};
