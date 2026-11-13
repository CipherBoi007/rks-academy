import { familyAuth } from "@/lib/server/familyAuth";

export const maxDuration = 60;

/** Replaces a parent's PIN (the one-time PIN at first sign-in, or their own later) and signs them in. */
export function POST(req: Request) {
  return familyAuth(req, "set-pin");
}
