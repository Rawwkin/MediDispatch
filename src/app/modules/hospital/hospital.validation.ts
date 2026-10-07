import { z } from "zod";

const objectIdSchema = z.string().uuid("Invalid id");

const createHospitalSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(6).max(32),
  email: z.string().trim().toLowerCase().email().optional(),
  address: z.string().trim().min(2).max(255),
  city: z.string().trim().min(2).max(80).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isActive: z.boolean().optional(),
});

const updateHospitalSchema = createHospitalSchema.partial();

const listHospitalsQuerySchema = z.object({
  city: z.string().trim().min(2).max(80).optional(),
  isActive: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((v) => (typeof v === "boolean" ? v : v === "true"))
    .optional(),
  search: z.string().trim().min(1).max(160).optional(),
});

const idParamSchema = z.object({ id: objectIdSchema });

export {
  createHospitalSchema,
  updateHospitalSchema,
  listHospitalsQuerySchema,
  idParamSchema,
};