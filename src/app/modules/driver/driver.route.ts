import { Router } from "express";
import { driverController } from "./driver.controller";
import { auth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createDriverSchema,
  idParamSchema,
  updateDriverSchema,
} from "./driver.validation";
import { UserRole } from "../../../../generated/prisma/enums";

const router = Router();
router.use(auth(UserRole.ADMIN));

router.get("/", driverController.list);
router.get("/:id", validate({ params: idParamSchema }), driverController.getById);
router.post("/", validate({ body: createDriverSchema }), driverController.create);
router.patch(
  "/:id",
  validate({ params: idParamSchema, body: updateDriverSchema }),
  driverController.update,
);
router.delete(
  "/:id",
  validate({ params: idParamSchema }),
  driverController.softDelete,
);

export const driverRoutes = router;