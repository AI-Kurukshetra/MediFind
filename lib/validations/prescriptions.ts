import { z } from "zod";

const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png"
] as const;

export const createPrescriptionUploadUrlSchema = z.object({
  fileName: z.string().trim().min(3).max(200),
  contentType: z.enum(allowedMimeTypes),
  orderId: z.string().uuid().optional()
});

export const createPrescriptionRecordSchema = z.object({
  filePath: z.string().trim().min(3).max(400),
  orderId: z.string().uuid().optional(),
  notes: z.string().trim().max(500).optional()
});

export const prescriptionParamsSchema = z.object({
  prescriptionId: z.string().uuid()
});

export const updatePrescriptionSchema = z.object({
  status: z.enum(["uploaded", "under_review", "verified", "rejected"]),
  notes: z.string().trim().max(500).optional()
});
