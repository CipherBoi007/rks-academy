import { expect, test } from "@playwright/test";
import { familySignIn } from "./helpers";

// Codes can be requested once a minute per number, so each test signs in with its own parent:
// Aravind Murugan's parent, and the parent of siblings Preethi and Pranav. (The responsive sweep uses a third.)
const ARAVIND_PARENT = "9000000101";
const SIBLINGS_PARENT = "9000020001";

test.describe.configure({ mode: "serial" });

test("parents sign in with a WhatsApp code and see their child", async ({ page }) => {
  await page.goto("/family");
  await expect(page).toHaveURL(/\/family\/login/);
  await page.getByLabel("Mobile number").fill("12345");
  await page.getByRole("button", { name: "Send code on WhatsApp" }).click();
  await expect(page.getByText("Enter your 10-digit mobile number")).toBeVisible();

  await familySignIn(page, ARAVIND_PARENT);
  await expect(page.getByRole("heading", { name: "Vanakkam, K. Murugan" })).toBeVisible();
  const card = page.locator("li", { hasText: "Aravind Murugan" });
  await expect(card.getByText("Morning Beginners")).toBeVisible();
  await expect(card.getByText(/Coach S\. Divya/)).toBeVisible();
  await expect(card.getByText("Fees are paid up")).toBeVisible();
  // The shop offer lives here, in the family app.
  await expect(page.getByRole("region", { name: "RKS Pro Shop offer" })).toContainText(/smash harder/i);

  await card.getByRole("link", { name: /progress, attendance/i }).click();
  await expect(page.getByRole("heading", { name: "Aravind Murugan" })).toBeVisible();
  await expect(page.getByRole("meter", { name: "Net play" })).toHaveAttribute("aria-valuenow", "88");
  await expect(page.getByRole("button", { name: "Update" })).toHaveCount(0); // read-only for parents
  await page.getByRole("link", { name: "RKS/26/1000" }).click();
  await expect(page.getByText("Rupees One Thousand Five Hundred Only")).toBeVisible();
});

test("one parent sees all their children, and only theirs", async ({ page }) => {
  await familySignIn(page, SIBLINGS_PARENT);
  await expect(page.locator("li", { hasText: "Preethi Jayakumar" })).toBeVisible();
  await expect(page.locator("li", { hasText: "Pranav Balaji" })).toBeVisible();

  // Someone else's child and receipt simply don't exist for this parent.
  expect((await page.request.get("/api/v1/family/children/1")).status()).toBe(404);
  expect((await page.request.get("/api/v1/family/receipts/26/1126")).status()).toBe(404);
  // A family session can't use the staff API.
  expect((await page.request.get("/api/v1/players")).status()).toBe(401);

  // The strip offer on a child's page can be dismissed for the session.
  await page.locator("li", { hasText: "Preethi Jayakumar" }).getByRole("link", { name: /progress, attendance/i }).click();
  await expect(page.getByRole("heading", { name: "Preethi Jayakumar" })).toBeVisible();
  await page.getByRole("button", { name: "Dismiss offer" }).click();
  await expect(page.getByLabel("RKS Pro Shop offer")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Preethi Jayakumar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dismiss offer" })).toHaveCount(0);

  await page.goto("/family/shop");
  await page.getByRole("radio", { name: "Shoes" }).click();
  await page.getByRole("link", { name: /Saga Lite Court Shoe/ }).click();
  await expect(page.getByRole("link", { name: "Enquire on WhatsApp" })).toHaveAttribute("href", /wa\.me\/910000000000/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/family\/login$/);
});
