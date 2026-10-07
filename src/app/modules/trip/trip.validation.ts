import { z } from "zod";
import { TripStatus } from "../../../../generated/prisma/enums";
import { objectIdSchema } from "../../utils/idSchema";

const updateTripStatusSchema = z.object({
  status: z.nativeEnum(TripStatus),
  distance: z.number().min(0).max(10_000).optional(),
  finalFare: z.number().min(0).max(1_000_000).optional(),
});

const selectHospitalSchema = z.object({
  hospitalId: objectIdSchema,
});

const listTripQuerySchema = z.object({
  status: z.nativeEnum(TripStatus).optional(),
  emergencyId: objectIdSchema.optional(),
});

const idParamSchema = z.object({ id: objectIdSchema });
const emergencyIdParamSchema = z.object({ emergencyId: objectIdSchema });

export {
  updateTripStatusSchema,
  selectHospitalSchema,
  listTripQuerySchema,
  idParamSchema,
  emergencyIdParamSchema,
};