import { expect, test } from "@playwright/test";

test.describe("Inventory dashboard flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "medifind_pharmacy_session",
        JSON.stringify({
          accessToken: "fake-token",
          user: {
            id: "user-1",
            email: "owner@example.com"
          },
          pharmacy: {
            id: "11111111-1111-1111-1111-111111111111",
            name: "City Pharmacy"
          }
        })
      );
    });
  });

  test("loads pharmacy inventory list", async ({ page }) => {
    await page.route("**/api/pharmacies/**/inventory?includeUnavailable=true", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          pharmacyId: "11111111-1111-1111-1111-111111111111",
          includeUnavailable: true,
          count: 1,
          results: [
            {
              id: "inv-1",
              pharmacy_id: "11111111-1111-1111-1111-111111111111",
              medicine_id: "22222222-2222-2222-2222-222222222222",
              quantity: 10,
              unit_price: 15,
              is_available: true,
              last_restocked_at: null,
              updated_at: "2026-03-14T10:00:00.000Z",
              medicines: {
                id: "22222222-2222-2222-2222-222222222222",
                name: "Paracetamol 500mg"
              }
            }
          ]
        })
      });
    });

    await page.goto("/dashboard");

    await expect(page.getByText("Loaded 1 inventory item(s).")).toBeVisible();
    await expect(page.getByText("Paracetamol 500mg")).toBeVisible();
  });

  test("adds and updates inventory item", async ({ page }) => {
    let quantity = 20;

    await page.route("**/api/pharmacies/**/inventory?includeUnavailable=true", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          pharmacyId: "11111111-1111-1111-1111-111111111111",
          includeUnavailable: true,
          count: 1,
          results: [
            {
              id: "inv-2",
              pharmacy_id: "11111111-1111-1111-1111-111111111111",
              medicine_id: "33333333-3333-3333-3333-333333333333",
              quantity,
              unit_price: 9.5,
              is_available: true,
              last_restocked_at: null,
              updated_at: "2026-03-14T10:05:00.000Z",
              medicines: {
                id: "33333333-3333-3333-3333-333333333333",
                name: "Amoxicillin"
              }
            }
          ]
        })
      });
    });

    await page.route("**/api/pharmacies/**/inventory", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              id: "inv-2"
            }
          })
        });
        return;
      }

      await route.fallback();
    });

    await page.route("**/api/pharmacies/**/inventory/**", async (route) => {
      if (route.request().method() === "PATCH") {
        quantity = 25;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              id: "inv-2"
            }
          })
        });
        return;
      }

      await route.fallback();
    });

    await page.route("**/api/medicines/options?query=Amoxicillin", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          count: 1,
          results: [
            {
              id: "33333333-3333-3333-3333-333333333333",
              name: "Amoxicillin",
              strength: "500mg",
              dosage_form: "Capsule"
            }
          ]
        })
      });
    });

    await page.goto("/dashboard");
    await expect(page.getByText("Loaded 1 inventory item(s).")).toBeVisible();

    await page.getByPlaceholder("Search e.g. Paracetamol").fill("Amoxicillin");
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByRole("button", { name: /Amoxicillin/ }).first().click();
    await page.getByLabel("Quantity").first().fill("20");
    await page.getByRole("button", { name: "Add Item" }).click();

    const itemCard = page.locator("li", {
      has: page.getByRole("heading", { name: "Amoxicillin" })
    });
    await expect(itemCard).toBeVisible();

    await page.locator("#qty-inv-2").fill("25");
    await itemCard.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.locator("#qty-inv-2")).toHaveValue("25");
  });
});
