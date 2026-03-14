import { z } from "zod";

const roleSchema = z.enum(["patient", "pharmacy_owner"]);

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(20).optional(),
  role: roleSchema.optional()
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().min(7).max(20).nullable().optional(),
    role: roleSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required."
  });