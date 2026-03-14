import { z } from "zod";

export const medicineSearchSchema = z.object({
  query: z.string().trim().min(2).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().min(1).max(50).default(10),
  sortBy: z.enum(["distance", "price"]).optional().default("distance")
});

export type MedicineSearchInput = z.infer<typeof medicineSearchSchema>;