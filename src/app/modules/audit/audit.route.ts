import { Router } from "express";
import { auditController } from "./audit.controller";
import { auth } from "../../middleware/auth";
import { UserRole } from "../../../../generated/prisma/enums";

const router = Router();
router.use(auth(UserRole.ADMIN));

router.get("/", auditController.list);

export const auditRoutes = router;