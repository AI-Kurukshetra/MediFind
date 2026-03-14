import { z } from "zod";

export const createOrderSchema = z
  .object({
    pharmacyId: z.string().uuid(),
    medicineId: z.string().uuid(),
    quantity: z.number().int().positive(),
    orderType: z.enum(["reservation", "delivery"]),
    prescriptionRequired: z.boolean().optional(),
    notes: z.string().trim().max(500).optional(),
    deliveryAddress: z.string().trim().min(5).max(500).optional(),
    deliveryLatitude: z.number().min(-90).max(90).optional(),
    deliveryLongitude: z.number().min(-180).max(180).optional(),
    contactPhone: z.string().trim().min(7).max(20).optional()
  })
  .superRefine((payload, context) => {
    if (payload.orderType === "delivery" && !payload.deliveryAddress) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveryAddress"],
        message: "Delivery address is required for delivery orders."
      });
    }
  });

export const listOrdersQuerySchema = z.object({
  orderType: z.enum(["reservation", "delivery"]).optional(),
  status: z
    .enum([
      "pending",
      "confirmed",
      "rejected",
      "ready",
      "completed",
      "cancelled"
    ])
    .optional(),
  limit: z.number().int().min(1).max(200).optional()
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "rejected",
    "ready",
    "completed",
    "cancelled"
  ])
});

export const orderParamsSchema = z.object({
  orderId: z.string().uuid()
});

export const updateDeliveryRequestStatusSchema = z.object({
  status: z.enum([
    "pending",
    "accepted",
    "in_transit",
    "delivered",
    "rejected",
    "cancelled"
  ])
});

export const deliveryRequestParamsSchema = z.object({
  deliveryRequestId: z.string().uuid()
});
