import { z } from "zod";

// Album validation schemas
export const createAlbumSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(255),
  releaseYear: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "string" ? Number(val) : val))
    .refine((val) => !isNaN(val), "L'année doit être un nombre")
    .refine((val) => val >= 1900, "L'année doit être >= 1900")
    .refine(
      (val) => val <= new Date().getFullYear() + 1,
      "L'année ne peut pas être dans le futur lointain"
    )
    .optional()
    .nullable(),
  coverUrl: z.string().url("URL d'image invalide").optional().nullable(),
});

export const updateAlbumSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  releaseYear: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "string" ? Number(val) : val))
    .refine((val) => !isNaN(val), "L'année doit être un nombre")
    .refine((val) => val >= 1900, "L'année doit être >= 1900")
    .refine(
      (val) => val <= new Date().getFullYear() + 1,
      "L'année ne peut pas être dans le futur lointain"
    )
    .optional()
    .nullable(),
  coverUrl: z.string().url().optional().nullable(),
});

// Track validation schemas
export const createTrackSchema = z.object({
  title: z.string().min(1, "Le titre est requis").max(255),
  trackNumber: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "string" ? Number(val) : val))
    .refine((val) => !isNaN(val), "Le numéro de piste doit être un nombre")
    .refine((val) => val > 0, "Le numéro de piste doit être positif")
    .optional(),
  durationSeconds: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "string" ? Number(val) : val))
    .refine((val) => !isNaN(val), "La durée doit être un nombre")
    .refine((val) => val > 0, "La durée doit être positive")
    .refine((val) => val <= 7200, "La durée ne peut pas dépasser 2 heures")
    .optional()
    .nullable(),
  audioUrl: z.string().url("URL audio invalide"),
  isExplicit: z.boolean().optional(),
});

export const updateTrackSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  trackNumber: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "string" ? Number(val) : val))
    .refine((val) => !isNaN(val), "Le numéro de piste doit être un nombre")
    .refine((val) => val > 0, "Le numéro de piste doit être positif")
    .optional(),
  durationSeconds: z
    .union([z.number(), z.string()])
    .transform((val) => (typeof val === "string" ? Number(val) : val))
    .refine((val) => !isNaN(val), "La durée doit être un nombre")
    .refine((val) => val > 0, "La durée doit être positive")
    .refine((val) => val <= 7200, "La durée ne peut pas dépasser 2 heures")
    .optional()
    .nullable(),
  audioUrl: z.string().url().optional().nullable(),
  isExplicit: z.boolean().optional(),
});

// Helper function to validate and return errors
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}
