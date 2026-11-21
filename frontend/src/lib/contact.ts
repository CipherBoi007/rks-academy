import type { ContactRelation } from "./types";

/** Players this age and over may manage their own account (the server enforces the same rule). */
export const ADULT_AGE = 18;

/** "Parent", "Guardian", or for an adult managing their own account, "Player". */
export function contactRole(relation: ContactRelation): string {
  return relation === "SELF" ? "Player" : relation === "PARENT" ? "Parent" : "Guardian";
}

/** Who to call: "Call parent", "Call guardian", or just "Call" when the player is their own contact. */
export function callLabel(relation: ContactRelation): string {
  return relation === "SELF" ? "Call" : `Call ${contactRole(relation).toLowerCase()}`;
}

/** Whether someone born on `dob` is an adult on `today` (both ISO dates). */
export function isAdult(dob: string, today: string): boolean {
  if (!dob || !today) return false;
  const [y, m, d] = dob.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const age = ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
  return age >= ADULT_AGE;
}
