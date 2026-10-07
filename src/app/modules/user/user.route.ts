import { Router } from "express";
import { userController } from "./user.controller";
import { auth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { updateMyProfileSchema } from "./user.validation";
import { UserRole } from "../../../../generated/prisma/enums";

const router = Router();

router.use(auth(UserRole.CALLER, UserRole.DISPATCHER, UserRole.ADMIN));

router.get("/me", userController.getMyProfile);
router.patch(
  "/me",
  validate({ body: updateMyProfileSchema }),
  userController.updateMyProfile,
);

export const userRoutes = router;