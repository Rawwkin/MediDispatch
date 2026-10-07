import { z } from "zod";
import { objectIdSchema } from "../../utils/idSchema";

const createDriverSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(32),
  licenseNumber: z.string().trim().min(2).max(64),
  licenseExpiry: z.coerce.date(),
  ambulanceId: objectIdSchema.optional(),
});

const updateDriverSchema = createDriverSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const idParamSchema = z.object({ id: objectIdSchema });

export { createDriverSchema, updateDriverSchema, idParamSchema };