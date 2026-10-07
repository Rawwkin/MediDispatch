import { Router } from "express";
import { hospitalController } from "./hospital.controller";
import { auth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createHospitalSchema,
  idParamSchema,
  listHospitalsQuerySchema,
  updateHospitalSchema,
} from "./hospital.validation";
import { UserRole } from "../../../../generated/prisma/enums";

const router = Router();

// Reads available to all authenticated roles (callers see the list for selection)
router.get(
  "/",
  auth(UserRole.CALLER, UserRole.DISPATCHER, UserRole.ADMIN),
  validate({ query: listHospitalsQuerySchema }),
  hospitalController.list,
);

router.get(
  "/:id",
  auth(UserRole.CALLER, UserRole.DISPATCHER, UserRole.ADMIN),
  validate({ params: idParamSchema }),
  hospitalController.getById,
);

// Mutations are admin-only
router.post(
  "/",
  auth(UserRole.ADMIN),
  validate({ body: createHospitalSchema }),
  hospitalController.create,
);
router.patch(
  "/:id",
  auth(UserRole.ADMIN),
  validate({ params: idParamSchema, body: updateHospitalSchema }),
  hospitalController.update,
);
router.delete(
  "/:id",
  auth(UserRole.ADMIN),
  validate({ params: idParamSchema }),
  hospitalController.softDelete,
);

export const hospitalRoutes = router;