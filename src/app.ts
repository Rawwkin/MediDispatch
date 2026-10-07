import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { globalLimiter } from "./app/middleware/rateLimit";

import { authRoutes } from "./app/modules/auth/auth.route";
import { userRoutes } from "./app/modules/user/user.route";
import { adminRoutes } from "./app/modules/admin/admin.route";
import { ambulanceRoutes } from "./app/modules/ambulance/ambulance.route";
import { driverRoutes } from "./app/modules/driver/driver.route";
import { hospitalRoutes } from "./app/modules/hospital/hospital.route";
import { emergencyRoutes } from "./app/modules/emergency/emergency.route";
import { dispatchRoutes } from "./app/modules/dispatch/dispatch.route";
import { tripRoutes } from "./app/modules/trip/trip.route";
import { paymentRoutes } from "./app/modules/payment/payment.route";
import { paymentController, webhookBodyParser } from "./app/modules/payment/payment.controller";
import { auditRoutes } from "./app/modules/audit/audit.route";

const app: Application = express();

app.get("/api/v1/health", (_req: Request, res: Response) =>
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    data: { status: "OK", service: "emergency-ambulance-dispatch" },
  }),
);

// Security & parsing
app.use(helmet());
app.use(
  cors({
    origin:
      config.clientUrl === "*"
        ? true
        : config.clientUrl.split(",").map((s) => s.trim()),
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

// Stripe webhook — needs the raw body for signature verification.
app.post(
  "/api/v1/payments/webhook",
  webhookBodyParser,
  (req: Request, _res: Response, next) => {
    (req as unknown as { rawBody: Buffer }).rawBody = req.body as Buffer;
    next();
  },
  paymentController.handleWebhook,
);

// API routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/ambulances", ambulanceRoutes);
app.use("/api/v1/drivers", driverRoutes);
app.use("/api/v1/hospitals", hospitalRoutes);
app.use("/api/v1/emergencies", emergencyRoutes);
app.use("/api/v1/dispatch", dispatchRoutes);
app.use("/api/v1/trips", tripRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/audit", auditRoutes);
app.use("/api/v1/admin", adminRoutes);

app.get("/", (_req: Request, res: Response) =>
  res.status(200).json({
    success: true,
    message: "Emergency Ambulance Dispatch API",
    data: { docs: "/api/v1/health" },
  }),
);

app.use(notFound);
app.use(globalErrorHandler);

export default app;