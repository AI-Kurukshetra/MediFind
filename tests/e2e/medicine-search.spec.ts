import { expect, test } from "@playwright/test";

test.describe("Medicine search flow", () => {
  test("shows search results from API", async ({ page }) => {
    await page.route("**/api/medicines/search**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          query: "paracetamol",
          latitude: 28.6139,
          longitude: 77.209,
          radiusKm: 10,
          count: 1,
          results: [
            {
              pharmacyId: "p1",
              pharmacyName: "Care Pharmacy",
              medicineId: "m1",
              medicineName: "Paracetamol 500mg",
              quantity: 14,
              distanceKm: 1.8
            }
          ]
        })
      });
    });

    await page.goto("/search");
    await page.getByLabel("Medicine Name").fill("paracetamol");
    await page.getByRole("button", { name: "Search Medicine" }).click();

    await expect(page.getByText("Paracetamol 500mg")).toBeVisible();
    await expect(page.getByText("Care Pharmacy")).toBeVisible();
    await expect(page.getByText("Stock: 14")).toBeVisible();
  });

  test("shows user-friendly error when API fails", async ({ page }) => {
    await page.route("**/api/medicines/search**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Failed to fetch medicine search results."
        })
      });
    });

    await page.goto("/search");
    await page.getByLabel("Medicine Name").fill("paracetamol");
    await page.getByRole("button", { name: "Search Medicine" }).click();

    await expect(
      page.getByText("Failed to fetch medicine search results.")
    ).toBeVisible();
  });
});