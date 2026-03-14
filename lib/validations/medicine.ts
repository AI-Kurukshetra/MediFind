import { z } from "zod";

export const createMedicineSchema = z.object({
  name: z.string().trim().min(2).max(160),
  genericName: z.string().trim().max(160).optional(),
  manufacturer: z.string().trim().max(160).optional(),
  dosageForm: z.string().trim().max(80).optional(),
  strength: z.string().trim().max(80).optional(),
  requiresPrescription: z.boolean().optional()
});

export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
