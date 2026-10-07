import { z } from "zod";
import {
  AmbulanceStatus,
  AmbulanceType,
} from "../../../../generated/prisma/enums";
import { objectIdSchema } from "../../utils/idSchema";
const latitudeSchema = z.number().min(-90).max(90);
const longitudeSchema = z.number().min(-180).max(180);

const createAmbulanceSchema = z.object({
  registrationNumber: z.string().trim().min(2).max(64),
  type: z.nativeEnum(AmbulanceType).optional(),
  capacity: z.number().int().min(1).max(20).optional(),
  status: z.nativeEnum(AmbulanceStatus).optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  isActive: z.boolean().optional(),
});

const updateAmbulanceSchema = createAmbulanceSchema.partial();

const listAmbulancesQuerySchema = z.object({
  status: z.nativeEnum(AmbulanceStatus).optional(),
  type: z.nativeEnum(AmbulanceType).optional(),
  isActive: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .transform((v) => (typeof v === "boolean" ? v : v === "true"))
    .optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

const idParamSchema = z.object({ id: objectIdSchema });

export {
  createAmbulanceSchema,
  updateAmbulanceSchema,
  listAmbulancesQuerySchema,
  idParamSchema,
};