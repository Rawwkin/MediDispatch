import { Router } from "express";
import { adminController } from "./admin.controller";
import { auth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  listUsersQuerySchema,
  userIdParamSchema,
} from "../user/user.validation";
import { UserRole } from "../../../../generated/prisma/enums";

const router = Router();
router.use(auth(UserRole.ADMIN));

router.get("/users", validate({ query: listUsersQuerySchema }), adminController.listUsers);
router.post(
  "/users",
  validate({ body: adminCreateUserSchema }),
  adminController.createUser,
);
router.get(
  "/users/:id",
  validate({ params: userIdParamSchema }),
  adminController.getUserById,
);
router.patch(
  "/users/:id",
  validate({ params: userIdParamSchema, body: adminUpdateUserSchema }),
  adminController.updateUser,
);
router.delete(
  "/users/:id",
  validate({ params: userIdParamSchema }),
  adminController.deleteUser,
);
router.patch(
  "/users/:id/restore",
  validate({ params: userIdParamSchema }),
  adminController.restoreUser,
);

router.get("/statistics", adminController.getStatistics);

export const adminRoutes = router;