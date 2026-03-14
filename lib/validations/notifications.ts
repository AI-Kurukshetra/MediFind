import { z } from "zod";

export const createStockAlertSubscriptionSchema = z.object({
  medicineId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().min(1).max(50).default(10)
});

export const notificationParamsSchema = z.object({
  notificationId: z.string().uuid()
});

export const subscriptionParamsSchema = z.object({
  subscriptionId: z.string().uuid()
});
