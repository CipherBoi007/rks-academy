import { NextResponse } from "next/server";
import { FAMILY_COOKIE, clearCookie, crossSite } from "@/lib/server/session";

export async function POST(req: Request) {
  const blocked = crossSite(req);
  if (blocked) return blocked;
  const res = NextResponse.json({ ok: true });
  clearCookie(res, FAMILY_COOKIE);
  return res;
}
