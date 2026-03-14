import { z } from "zod";

export const registerPharmacySchema = z.object({
  name: z.string().trim().min(2).max(120),
  addressLine1: z.string().trim().min(3).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(3).max(20),
  country: z.string().trim().min(2).max(3).default("IN"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  contactPhone: z.string().trim().min(7).max(20).optional()
});

export type RegisterPharmacyInput = z.infer<typeof registerPharmacySchema>;