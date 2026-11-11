import { expect, type Page } from "@playwright/test";

export const OWNER = { mobile: "9000000000", pin: "1234" };
export const COACH = { mobile: "9000000001", pin: "1234" };

export async function signIn(page: Page, who: { mobile: string; pin: string }) {
  await page.goto("/login");
  await page.getByLabel("Mobile number").fill(who.mobile);
  await page.getByLabel("PIN").fill(who.pin);
  await page.getByRole("button", { name: "Enter academy" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** True when the page itself scrolls sideways (deliberate inner scrollers are fine). */
export async function hasHorizontalPageScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

/** Family sign-in. In dev the WhatsApp provider only logs, so the screen shows the code. */
export async function familySignIn(page: Page, mobile: string) {
  await page.goto("/family/login");
  await page.getByLabel("Mobile number").fill(mobile);
  await page.getByRole("button", { name: "Send code on WhatsApp" }).click();
  const code = (await page.getByText(/here is the code/).locator("strong").textContent())!.trim();
  await page.getByLabel(/Code sent to/).fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/family$/);
}
