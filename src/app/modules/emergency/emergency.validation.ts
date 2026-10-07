import { z } from "zod";
import {
  EmergencyPriority,
  EmergencyStatus,
  EmergencyType,
} from "../../../../generated/prisma/enums";
import { objectIdSchema } from "../../utils/idSchema";

const createEmergencySchema = z.object({
  emergencyType: z.nativeEnum(EmergencyType),
  description: z.string().trim().max(1000).optional(),
  priority: z.nativeEnum(EmergencyPriority).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationAddress: z.string().trim().max(255).optional(),
  contactPhone: z.string().trim().min(6).max(32).optional(),
  contactName: z.string().trim().min(2).max(120).optional(),
});

const updateEmergencySchema = z.object({
  description: z.string().trim().max(1000).optional(),
  priority: z.nativeEnum(EmergencyPriority).optional(),
  locationAddress: z.string().trim().max(255).optional(),
  contactPhone: z.string().trim().min(6).max(32).optional(),
  contactName: z.string().trim().min(2).max(120).optional(),
});

const listEmergenciesQuerySchema = z.object({
  status: z.nativeEnum(EmergencyStatus).optional(),
  priority: z.nativeEnum(EmergencyPriority).optional(),
  type: z.nativeEnum(EmergencyType).optional(),
  search: z.string().trim().min(1).max(160).optional(),
});

const cancelSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

const idParamSchema = z.object({ id: objectIdSchema });

export {
  createEmergencySchema,
  updateEmergencySchema,
  listEmergenciesQuerySchema,
  cancelSchema,
  idParamSchema,
};