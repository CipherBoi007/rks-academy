import { expect, test } from "@playwright/test";
import { COACH, OWNER, signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

test("login rejects a wrong PIN and redirects signed-out visitors", async ({ page }) => {
  await page.goto("/players");
  await expect(page).toHaveURL(/\/login\?next=%2Fplayers/);
  await page.getByLabel("Mobile number").fill(OWNER.mobile);
  await page.getByLabel("PIN").fill("999999");
  await page.getByRole("button", { name: "Enter academy" }).click();
  await expect(page.getByText("Mobile number or PIN is incorrect")).toBeVisible();
});

test("owner dashboard shows the seeded month", async ({ page }) => {
  await signIn(page, OWNER);
  await expect(page.getByText("₹66,900")).toBeVisible();
  await expect(page.getByText("Nov 2026 · 12 payments")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dues alert" })).toBeVisible();
  await expect(page.getByText("9 due")).toBeVisible();
  // Shop offers are for families only; the staff app never shows them.
  await expect(page.getByRole("region", { name: "RKS Pro Shop offer" })).toHaveCount(0);
  // Recent payments are newest first, as in the design.
  const recent = page.locator("li", { hasText: "Surya Narayanan" }).first();
  await expect(recent).toContainText("₹15,000");
});

test("players filter by fee status, search by ID, and open a profile", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto("/players");
  await expect(page.getByText(/Showing\s+30\s+players/)).toBeVisible();
  await page.getByRole("radio", { name: "Due" }).click();
  await expect(page.getByText(/Showing\s+9\s+players/)).toBeVisible();
  await page.getByRole("radio", { name: "Any fee status" }).click();
  await page.getByLabel("Search players").fill("RKS101");
  await expect(page.getByText(/Showing\s+1\s+player\b/)).toBeVisible();
  await page.getByRole("link", { name: /Aravind Murugan/ }).click();

  await expect(page.getByRole("heading", { name: "Aravind Murugan" })).toBeVisible();
  await expect(page.getByText("Junior Coach")).toBeVisible();
  await expect(page.getByRole("meter", { name: "Net play" })).toHaveAttribute("aria-valuenow", "88");
  await expect(page.getByRole("link", { name: "RKS/26/1000" })).toBeVisible();
});

test("attendance: mark all present and save", async ({ page }) => {
  await signIn(page, COACH);
  await page.goto("/attendance");
  await expect(page.getByRole("radio", { name: /Morning Beginners/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText(/4\s*Unmarked/)).toBeVisible();
  await page.getByRole("button", { name: "Mark all present" }).click();
  await page.getByRole("button", { name: "Save attendance" }).click();
  await expect(page.getByText("Attendance saved")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save attendance" })).toBeDisabled();
});

test("coach sees no fee amounts or fee screens", async ({ page }) => {
  await signIn(page, COACH);
  await expect(page.getByText("Active players")).toBeVisible();
  await expect(page.getByText("Fees collected")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Dues alert" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Fees", exact: true })).toHaveCount(0);
  await page.goto("/fees");
  await expect(page.getByRole("heading", { name: "Owner only" })).toBeVisible();
  await page.goto("/players/1");
  await expect(page.getByRole("heading", { name: "Fee history" })).toHaveCount(0);
  await expect(page.getByText("Paid").first()).toBeVisible();
});

test("record a payment and open its receipt", async ({ page, context }) => {
  await signIn(page, OWNER);
  await page.goto("/fees?tab=pending");
  await page.locator("li", { hasText: "Harish Kumar" }).getByRole("button", { name: "Collect" }).click();
  const sheet = page.getByRole("dialog", { name: "Record payment" });
  await expect(sheet.getByText("Due ₹1,500 for Nov 2026")).toBeVisible();
  await expect(sheet.getByLabel("Amount (₹)")).toHaveValue("1500");

  // Changing the amount demands a reason.
  await sheet.getByLabel("Amount (₹)").fill("1400");
  await sheet.getByRole("button", { name: "Save & generate receipt" }).click();
  await expect(sheet.getByText("Add a reason")).toBeVisible();
  await sheet.getByLabel("Amount (₹)").fill("1500");
  await sheet.getByRole("radio", { name: "Cash" }).click();
  await sheet.getByRole("button", { name: "Save & generate receipt" }).click();

  await expect(page.getByText("Payment recorded · ₹1,500")).toBeVisible();
  const [receipt] = await Promise.all([context.waitForEvent("page"), page.getByRole("link", { name: "View receipt" }).click()]);
  await expect(receipt.getByText("RKS/26/1197")).toBeVisible();
  await expect(receipt.getByText("Rupees One Thousand Five Hundred Only")).toBeVisible();
  await expect(receipt.getByText("Cash", { exact: true })).toBeVisible();
});

test("fee structure shows plans and policies", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto("/fee-structure");
  await expect(page.getByText("Most popular")).toBeVisible();
  await expect(page.getByText("₹4,200")).toBeVisible();
  await expect(page.getByText("₹100 after the 10th of the month, then ₹10/day (max ₹300)")).toBeVisible();
  await page.getByRole("button", { name: "Edit plan" }).first().click();
  await expect(page.getByRole("dialog", { name: "Edit plan" }).getByLabel("Plan name")).toHaveValue("Monthly");
});

test("store filters and product WhatsApp enquiry", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto("/store");
  await page.getByRole("radio", { name: "Shoes" }).click();
  await expect(page.getByRole("link", { name: /Saga Lite Court Shoe/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Astrox 77 Pro/ })).toHaveCount(0);
  await page.goto("/store/1");
  await expect(page.getByText("Only 6 left")).toBeVisible();
  await expect(page.getByText("Save ₹2,500")).toBeVisible();
  await page.getByRole("radio", { name: "3U G5" }).click();
  const href = await page.getByRole("link", { name: "Enquire on WhatsApp" }).getAttribute("href");
  expect(href).toContain("https://wa.me/910000000000?text=");
  expect(decodeURIComponent(href!)).toContain("Weight / Grip: 3U G5");
  await expect(page.getByRole("heading", { name: "You may also like" })).toBeVisible();
});

test("the staff app shows no shop offers anywhere", async ({ page }) => {
  await signIn(page, OWNER);
  for (const route of ["/dashboard", "/players", "/fees", "/store"]) {
    await page.goto(route);
    await expect(page.locator("main h1").first()).toBeVisible();
    await expect(page.getByLabel("RKS Pro Shop offer")).toHaveCount(0);
  }
});
