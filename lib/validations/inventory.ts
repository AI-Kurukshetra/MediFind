import { z } from "zod";

export const pharmacyInventoryParamsSchema = z.object({
  pharmacyId: z.string().uuid()
});

export const inventoryRecordParamsSchema = z.object({
  pharmacyId: z.string().uuid(),
  inventoryId: z.string().uuid()
});

export const createInventorySchema = z.object({
  medicineId: z.string().uuid(),
  quantity: z.number().int().min(0),
  unitPrice: z.number().min(0).nullable().optional(),
  isAvailable: z.boolean().optional(),
  lastRestockedAt: z.string().datetime().optional()
});

export const updateInventorySchema = z
  .object({
    quantity: z.number().int().min(0).optional(),
    unitPrice: z.number().min(0).nullable().optional(),
    isAvailable: z.boolean().optional(),
    lastRestockedAt: z.string().datetime().nullable().optional()
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required for inventory update."
  });

export type CreateInventoryInput = z.infer<typeof createInventorySchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;