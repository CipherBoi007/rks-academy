import { expect, test } from "@playwright/test";
import { OWNER, signIn } from "./helpers";

// Runs after app.spec.ts (alphabetical), which records Harish Kumar's payment as receipt RKS/26/1197.
test.describe.configure({ mode: "serial" });

/** A valid 1x1 PNG for upload tests. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

test("owner adds a coach login and sees its one-time PIN once", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Add login" }).click();
  const sheet = page.getByRole("dialog", { name: "Add login" });
  await sheet.getByLabel("Name").fill("K. Priya");
  await sheet.getByLabel("Mobile number").fill("9333333333");
  await sheet.getByLabel("Coach profile").selectOption({ label: "S. Divya" });
  await sheet.getByRole("button", { name: "Create login" }).click();

  const pin = page.getByRole("dialog", { name: "One-time PIN" });
  await expect(pin.getByText(/^\d{6}$/)).toBeVisible();
  await pin.getByRole("button", { name: "Done" }).click();
  const row = page.locator("li", { hasText: "K. Priya" });
  await expect(row.getByText("PIN not set yet")).toBeVisible();
});

test("courts and batches: add a court, refuse a double-booked batch", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto("/settings?tab=courts");
  await page.getByRole("button", { name: "Add court" }).click();
  const court = page.getByRole("dialog", { name: "Add court" });
  await court.getByLabel("Name").fill("Court 5");
  await court.getByRole("button", { name: "Save court" }).click();
  await expect(page.getByText("Court added")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Court 5/ })).toBeVisible();

  await page.getByRole("button", { name: "Add batch" }).click();
  const batch = page.getByRole("dialog", { name: "Add batch" });
  await batch.getByLabel("Name").fill("Early Birds");
  await batch.getByLabel("Court").selectOption({ label: "Court 1" });
  await batch.getByLabel("Coach").selectOption({ label: "S. Divya" });
  await batch.getByLabel("Starts").fill("06:30");
  await batch.getByLabel("Ends").fill("07:30");
  await batch.getByRole("button", { name: "Save batch" }).click();
  await expect(page.getByText("Court 1 is already booked for Morning Beginners at that time")).toBeVisible();
});

test("void a wrong payment: it stays on record and the fee is due again", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto("/fees?tab=history");
  const row = page.locator("tr", { hasText: "RKS/26/1197" });
  await row.getByRole("button", { name: "Void receipt RKS/26/1197" }).click();
  const sheet = page.getByRole("dialog", { name: "Void payment" });
  await sheet.getByRole("button", { name: "Void this payment" }).click();
  await expect(sheet.getByText("Say why, in a few words")).toBeVisible();
  await sheet.getByLabel("Reason").fill("Recorded twice by mistake");
  await sheet.getByRole("button", { name: "Void this payment" }).click();

  await expect(page.getByText("Receipt RKS/26/1197 voided")).toBeVisible();
  await expect(row.getByText("Voided")).toBeVisible();
  await page.goto("/fees?tab=pending");
  await expect(page.locator("li", { hasText: "Harish Kumar" })).toBeVisible();

  const receipt = await page.request.get("/api/v1/receipts/26/1197");
  expect((await receipt.json()).voided).toBe(true);

  // A voided payment never shows up as a recent payment on the dashboard.
  await page.goto("/dashboard");
  const recent = page.getByRole("heading", { name: "Recent payments" }).locator("xpath=ancestor::div[contains(@class, 'rounded-2xl')][1]");
  await expect(recent.getByText("Surya Narayanan")).toBeVisible();
  await expect(recent.getByText("Harish Kumar")).toHaveCount(0);
});

test("exports download as Excel-friendly CSV", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto("/fees");
  await page.getByRole("button", { name: "Export" }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "Pending dues" }).click()]);
  expect(download.suggestedFilename()).toBe("rks-dues-2026-11-05.csv");
  const body = (await (await download.createReadStream()).toArray()).join("");
  expect(body.startsWith("﻿Player ID,Player,Parent")).toBe(true);
  expect(body).toContain("Harish Kumar");
});

test("shop editor adds a product with an uploaded photo", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto("/store");
  await page.getByRole("button", { name: "Add product" }).click();
  const sheet = page.getByRole("dialog", { name: "Add product" });
  await sheet.locator('input[type="file"]').first().setInputFiles({ name: "bag.png", mimeType: "image/png", buffer: PNG });
  await expect(sheet.getByRole("img", { name: "Photo 1" })).toBeVisible();
  await sheet.getByLabel("Brand").fill("RKS");
  await sheet.getByLabel("Category").selectOption("BAGS");
  await sheet.getByLabel("Name", { exact: true }).fill("Academy Kit Bag");
  await sheet.getByLabel("Price (₹)").fill("999");
  await sheet.getByLabel("MRP (₹)").fill("1299");
  await sheet.getByRole("button", { name: "Save product" }).click();

  await expect(page.getByText("Academy Kit Bag added to the store")).toBeVisible();
  await page.getByRole("radio", { name: "Bags" }).click();
  await expect(page.getByRole("link", { name: /Academy Kit Bag/ })).toBeVisible();
});

test("WhatsApp setup can be checked with a test message", async ({ page }) => {
  await signIn(page, OWNER);
  await page.goto("/settings?tab=whatsapp");
  await expect(page.getByText("Recording only: nothing is sent yet")).toBeVisible();
  await page.getByLabel("Mobile number").fill("9000000000");
  await page.getByRole("button", { name: "Send test message" }).click();
  await expect(page.getByText("Recorded (not sent: the provider is set to log only).")).toBeVisible();
});

test("security: cross-site writes are refused and security headers are set", async ({ page }) => {
  await signIn(page, OWNER);
  const forged = await page.request.post("/api/v1/payments", {
    headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
    data: { playerId: 3, mode: "UPI" },
  });
  expect(forged.status()).toBe(403);
  expect((await forged.json()).code).toBe("CROSS_SITE");

  const res = await page.request.get("/login");
  const headers = res.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-powered-by"]).toBeUndefined();
});
