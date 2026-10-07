import { Router } from "express";
import { dispatchController } from "./dispatch.controller";
import { auth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  assignAmbulanceSchema,
  assignmentIdParamSchema,
  availableQuerySchema,
  emergencyIdParamSchema,
  reassignAmbulanceSchema,
  updateDispatchStatusSchema,
} from "./dispatch.validation";
import { UserRole } from "../../../../generated/prisma/enums";

const router = Router();
router.use(auth(UserRole.DISPATCHER, UserRole.ADMIN));

router.get(
  "/available-ambulances",
  validate({ query: availableQuerySchema }),
  dispatchController.availableAmbulances,
);

router.get("/assignments", dispatchController.listAssignments);

router.post(
  "/:emergencyId/assign",
  validate({ params: emergencyIdParamSchema, body: assignAmbulanceSchema }),
  dispatchController.assignAmbulance,
);

router.patch(
  "/:assignmentId/reassign",
  validate({ params: assignmentIdParamSchema, body: reassignAmbulanceSchema }),
  dispatchController.reassignAmbulance,
);

router.patch(
  "/:assignmentId/status",
  validate({ params: assignmentIdParamSchema, body: updateDispatchStatusSchema }),
  dispatchController.updateAssignmentStatus,
);

export const dispatchRoutes = router;