import { expect, type Page } from "@playwright/test";

export const OWNER = { mobile: "9000000000", pin: "123456" };
export const COACH = { mobile: "9000000001", pin: "123456" };

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

/** Family sign-in. Every demo parent has PIN 123456 (db/demo/V7_1). */
export async function familySignIn(page: Page, mobile: string) {
  await page.goto("/family/login");
  await page.getByLabel("Mobile number").fill(mobile);
  await page.getByLabel("PIN").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/family$/);
}
