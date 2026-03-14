import { expect, test } from "@playwright/test";

test.describe("Authentication flow", () => {
  test("renders pharmacy auth experience", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(page.getByRole("heading", { name: "Modern pharmacy operations" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pharmacy Owner Sign In" })).toBeVisible();
    await expect(page.getByLabel("Work Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await page.getByRole("button", { name: "Create Pharmacy Account" }).click();
    await expect(page.getByRole("heading", { name: "Create Pharmacy Account" })).toBeVisible();
    await expect(page.getByLabel("Pharmacy Name")).toBeVisible();
  });
});
