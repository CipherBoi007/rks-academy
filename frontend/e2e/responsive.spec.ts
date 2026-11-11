import { expect, test } from "@playwright/test";
import { familySignIn, hasHorizontalPageScroll, OWNER, signIn } from "./helpers";

const WIDTHS = [360, 390, 768, 1024, 1440];
const ROUTES = [
  "/dashboard",
  "/players",
  "/players/1",
  "/attendance",
  "/fees",
  "/fee-structure",
  "/store",
  "/store/1",
  "/settings",
  "/settings?tab=courts",
  "/settings?tab=whatsapp",
];

test.describe.configure({ mode: "serial" });

test("login has no horizontal scroll at any width", async ({ page }) => {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Enter academy" })).toBeVisible();
    expect(await hasHorizontalPageScroll(page), `/login at ${width}px`).toBe(false);
    await page.screenshot({ path: `e2e/.screens/login-${width}.png`, fullPage: true });
  }
});

test("every screen fits every width, with the right navigation", async ({ page }) => {
  test.setTimeout(5 * 60_000); // 11 routes x 5 widths, each with a full-page screenshot
  await signIn(page, OWNER);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.locator("main h1, main [role='status']").first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(await hasHorizontalPageScroll(page), `${route} at ${width}px`).toBe(false);

      const tabBar = page.getByRole("navigation", { name: "Main" }).filter({ hasText: "Home" });
      if (width < 768) await expect(tabBar).toBeVisible();
      else await expect(tabBar).toBeHidden();

      const name = route.replace(/[/?=]/g, "_").replace(/^_/, "");
      await page.screenshot({ path: `e2e/.screens/${name}-${width}.png`, fullPage: true });
    }
  }
});

test("tap targets in the phone tab bar are at least 44px", async ({ page }) => {
  await signIn(page, OWNER);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/dashboard");
  const links = page.getByRole("navigation", { name: "Main" }).filter({ hasText: "Home" }).getByRole("link");
  for (const box of await links.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))) {
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
});

const FAMILY_ROUTES = ["/family", "/family/child/2", "/family/shop", "/family/shop/1", "/family/receipts/26/1007"];

test("family screens fit every width", async ({ page }) => {
  test.setTimeout(3 * 60_000);
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/family/login");
    expect(await hasHorizontalPageScroll(page), `/family/login at ${width}px`).toBe(false);
  }
  await familySignIn(page, "9000020002"); // Kavya, Abinaya and Keerthana's parent
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of FAMILY_ROUTES) {
      await page.goto(route);
      await expect(page.locator("main h1, main [role='status']").first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(await hasHorizontalPageScroll(page), `${route} at ${width}px`).toBe(false);
      const tabBar = page.getByRole("navigation", { name: "Family" }).filter({ hasText: "Shop" }).last();
      if (route.startsWith("/family/receipts")) continue; // printable page, no app frame
      if (width < 768) await expect(tabBar).toBeVisible();
      const name = route.replace(/[/?=]/g, "_").replace(/^_/, "");
      await page.screenshot({ path: `e2e/.screens/${name}-${width}.png`, fullPage: true });
    }
  }
});
