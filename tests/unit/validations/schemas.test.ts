import { describe, expect, it } from "vitest";

import { signInSchema, signUpSchema } from "@/lib/validations/auth";
import { createOrderSchema } from "@/lib/validations/orders";
import { medicineSearchSchema } from "@/lib/validations/medicine-search";

describe("validation schemas", () => {
  it("accepts valid medicine search input", () => {
    const parsed = medicineSearchSchema.parse({
      query: "Paracetamol",
      latitude: 28.61,
      longitude: 77.2,
      radiusKm: 8
    });

    expect(parsed.query).toBe("Paracetamol");
    expect(parsed.radiusKm).toBe(8);
  });

  it("rejects invalid medicine search coordinates", () => {
    expect(() =>
      medicineSearchSchema.parse({
        query: "Aspirin",
        latitude: 121,
        longitude: 77.2
      })
    ).toThrow();
  });

  it("accepts valid sign-up and sign-in payloads", () => {
    const signUp = signUpSchema.parse({
      email: "user@example.com",
      password: "password123",
      fullName: "John Doe",
      role: "patient"
    });

    const signIn = signInSchema.parse({
      email: "user@example.com",
      password: "password123"
    });

    expect(signUp.email).toBe("user@example.com");
    expect(signIn.password).toBe("password123");
  });

  it("requires deliveryAddress for delivery orders", () => {
    expect(() =>
      createOrderSchema.parse({
        pharmacyId: "11111111-1111-4111-8111-111111111111",
        medicineId: "22222222-2222-4222-8222-222222222222",
        quantity: 1,
        orderType: "delivery"
      })
    ).toThrow("Delivery address is required for delivery orders.");
  });

  it("allows reservation order without delivery address", () => {
    const parsed = createOrderSchema.parse({
      pharmacyId: "11111111-1111-4111-8111-111111111111",
      medicineId: "22222222-2222-4222-8222-222222222222",
      quantity: 1,
      orderType: "reservation"
    });

    expect(parsed.orderType).toBe("reservation");
  });
});
