import { Router } from "express";
import { tripController } from "./trip.controller";
import { auth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  idParamSchema,
  listTripQuerySchema,
  selectHospitalSchema,
  updateTripStatusSchema,
} from "./trip.validation";
import { UserRole } from "../../../../generated/prisma/enums";

const router = Router();
router.use(auth(UserRole.CALLER, UserRole.DISPATCHER, UserRole.ADMIN));

router.get("/", validate({ query: listTripQuerySchema }), tripController.list);
router.get("/:id", validate({ params: idParamSchema }), tripController.getById);

router.patch(
  "/:id/hospital",
  auth(UserRole.DISPATCHER, UserRole.ADMIN),
  validate({ params: idParamSchema, body: selectHospitalSchema }),
  tripController.selectHospital,
);

router.patch(
  "/:id/status",
  auth(UserRole.DISPATCHER, UserRole.ADMIN),
  validate({ params: idParamSchema, body: updateTripStatusSchema }),
  tripController.updateStatus,
);

export const tripRoutes = router;