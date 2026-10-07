import { Router } from "express";
import { emergencyController } from "./emergency.controller";
import { auth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  cancelSchema,
  createEmergencySchema,
  idParamSchema,
  listEmergenciesQuerySchema,
  updateEmergencySchema,
} from "./emergency.validation";
import { UserRole } from "../../../../generated/prisma/enums";

const router = Router();

router.use(auth(UserRole.CALLER, UserRole.DISPATCHER, UserRole.ADMIN));

router.post(
  "/",
  validate({ body: createEmergencySchema }),
  emergencyController.create,
);

router.get(
  "/",
  validate({ query: listEmergenciesQuerySchema }),
  emergencyController.list,
);

router.get(
  "/:id",
  validate({ params: idParamSchema }),
  emergencyController.getById,
);

router.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateEmergencySchema }),
  emergencyController.update,
);

router.patch(
  "/:id/cancel",
  validate({ params: idParamSchema, body: cancelSchema }),
  emergencyController.cancel,
);

router.delete(
  "/:id",
  validate({ params: idParamSchema }),
  emergencyController.softDelete,
);

export const emergencyRoutes = router;