import { Router } from "express";
import { ambulanceController } from "./ambulance.controller";
import { auth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createAmbulanceSchema,
  idParamSchema,
  listAmbulancesQuerySchema,
  updateAmbulanceSchema,
} from "./ambulance.validation";
import { UserRole } from "../../../../generated/prisma/enums";

const router = Router();

// Authenticated reads for dispatcher / admin
router.get(
  "/",
  auth(UserRole.DISPATCHER, UserRole.ADMIN),
  validate({ query: listAmbulancesQuerySchema }),
  ambulanceController.list,
);

router.get(
  "/:id",
  auth(UserRole.DISPATCHER, UserRole.ADMIN),
  validate({ params: idParamSchema }),
  ambulanceController.getById,
);

// Mutations are admin-only
router.post(
  "/",
  auth(UserRole.ADMIN),
  validate({ body: createAmbulanceSchema }),
  ambulanceController.create,
);

router.patch(
  "/:id",
  auth(UserRole.ADMIN),
  validate({ params: idParamSchema, body: updateAmbulanceSchema }),
  ambulanceController.update,
);

router.delete(
  "/:id",
  auth(UserRole.ADMIN),
  validate({ params: idParamSchema }),
  ambulanceController.softDelete,
);

export const ambulanceRoutes = router;