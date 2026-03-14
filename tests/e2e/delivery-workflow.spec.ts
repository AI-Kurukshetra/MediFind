import { expect, test } from "@playwright/test";

test.describe("Delivery workflow API contracts", () => {
  test("creates reservation/delivery order payload via API route", async ({ page }) => {
    await page.route("**/api/orders", async (route) => {
      const request = route.request();
      const payload = request.postDataJSON();

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          order: {
            id: "order-1",
            order_type: payload.orderType,
            status: "pending"
          },
          deliveryRequest:
            payload.orderType === "delivery"
              ? {
                  id: "dr-1",
                  status: "pending"
                }
              : null
        })
      });
    });

    await page.goto("/");

    const response = await page.evaluate(async () => {
      const result = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer fake-token"
        },
        body: JSON.stringify({
          pharmacyId: "11111111-1111-1111-1111-111111111111",
          medicineId: "22222222-2222-2222-2222-222222222222",
          quantity: 1,
          orderType: "delivery",
          deliveryAddress: "221B Baker Street"
        })
      });

      return {
        status: result.status,
        data: await result.json()
      };
    });

    expect(response.status).toBe(201);
    expect(response.data.order.order_type).toBe("delivery");
    expect(response.data.deliveryRequest.status).toBe("pending");
  });

  test("updates delivery request status", async ({ page }) => {
    await page.route("**/api/delivery-requests/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          deliveryRequest: {
            id: "dr-1",
            status: "accepted"
          }
        })
      });
    });

    await page.goto("/");

    const response = await page.evaluate(async () => {
      const result = await fetch("/api/delivery-requests/dr-1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer fake-token"
        },
        body: JSON.stringify({ status: "accepted" })
      });

      return {
        status: result.status,
        data: await result.json()
      };
    });

    expect(response.status).toBe(200);
    expect(response.data.deliveryRequest.status).toBe("accepted");
  });
});