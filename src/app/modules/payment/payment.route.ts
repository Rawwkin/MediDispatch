import { Router } from "express";
import { paymentController } from "./payment.controller";
import { auth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { createPaymentSchema, idParamSchema } from "./payment.validation";
import { UserRole } from "../../../../generated/prisma/enums";

const router = Router();

// Caller-facing routes
router.post(
  "/create",
  auth(UserRole.CALLER),
  validate({ body: createPaymentSchema }),
  paymentController.createCheckoutSession,
);

router.get("/", auth(UserRole.CALLER), paymentController.listMyPayments);
router.get(
  "/:id",
  auth(UserRole.CALLER),
  validate({ params: idParamSchema }),
  paymentController.getById,
);

// Admin oversight
router.get(
  "/admin/all",
  auth(UserRole.ADMIN),
  paymentController.listAllPayments,
);

export const paymentRoutes = router;