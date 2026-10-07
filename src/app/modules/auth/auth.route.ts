import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "../../middleware/validate";
import { authLimiter } from "../../middleware/rateLimit";
import { auth } from "../../middleware/auth";
import {
  loginSchema,
  refreshSchema,
  registerSchema,
} from "./auth.validation";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate({ body: registerSchema }),
  authController.register,
);

router.post(
  "/login",
  authLimiter,
  validate({ body: loginSchema }),
  authController.login,
);

router.post(
  "/refresh",
  validate({ body: refreshSchema }),
  authController.refreshToken,
);

router.post("/logout", auth(), authController.logout);

export const authRoutes = router;