import { NextResponse } from "next/server";
import { clearSession, crossSite } from "@/lib/server/session";

export async function POST(req: Request) {
  const blocked = crossSite(req);
  if (blocked) return blocked;
  const res = NextResponse.json({ ok: true });
  clearSession(res);
  return res;
}
