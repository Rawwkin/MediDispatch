import { z } from "zod";
import { DispatchAssignmentStatus } from "../../../../generated/prisma/enums";
import {
  EmergencyPriority,
  EmergencyType,
} from "../../../../generated/prisma/enums";

const objectIdSchema = z.string().uuid("Invalid id");

const assignAmbulanceSchema = z.object({
  ambulanceId: objectIdSchema,
  note: z.string().trim().max(500).optional(),
});

const reassignAmbulanceSchema = z.object({
  newAmbulanceId: objectIdSchema,
  note: z.string().trim().max(500).optional(),
});

const updateDispatchStatusSchema = z.object({
  status: z.nativeEnum(DispatchAssignmentStatus),
  note: z.string().trim().max(500).optional(),
});

const availableQuerySchema = z.object({
  emergencyId: objectIdSchema.optional(),
  emergencyType: z.nativeEnum(EmergencyType).optional(),
  priority: z.nativeEnum(EmergencyPriority).optional(),
});

const emergencyIdParamSchema = z.object({ emergencyId: objectIdSchema });
const assignmentIdParamSchema = z.object({ assignmentId: objectIdSchema });

export {
  assignAmbulanceSchema,
  reassignAmbulanceSchema,
  updateDispatchStatusSchema,
  availableQuerySchema,
  emergencyIdParamSchema,
  assignmentIdParamSchema,
};