import { familyAuth } from "@/lib/server/familyAuth";

// A sleeping API host can take most of a minute to wake; give the function long enough to wait for it.
export const maxDuration = 60;

/** Parent sign-in with mobile number and PIN. */
export function POST(req: Request) {
  return familyAuth(req, "login");
}
