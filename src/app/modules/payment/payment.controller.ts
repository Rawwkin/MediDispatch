import { requireParam } from "../../utils/request";
import { Request, Response } from "express";
import httpStatus from "http-status";
import express from "express";
import { paymentService } from "./payment.service";
import { stripe } from "../../lib/stripe";
import config from "../../config";
import { sendResponse } from "../../utils/sendResponse";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/AppError";

export const paymentController = {
  createCheckoutSession: catchAsync(async (req: Request, res: Response) => {
    const data = await paymentService.createCheckoutSession(req.user!.id, req.body, req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Checkout session created",
      data,
    });
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    const data = await paymentService.getById(req.user!.role, req.user!.id, requireParam(req.params.id));
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Payment retrieved",
      data,
    });
  }),

  listMyPayments: catchAsync(async (req: Request, res: Response) => {
    const data = await paymentService.listMyPayments(req.user!.id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Payments retrieved",
      data,
    });
  }),

  listAllPayments: catchAsync(async (_req: Request, res: Response) => {
    const data = await paymentService.listAllPayments();
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Payments retrieved",
      data,
    });
  }),

  /**
   * Stripe webhook — must receive the raw request body to verify the signature.
   * Mounted separately in app.ts (raw parser, no auth, no JSON parser).
   */
  handleWebhook: catchAsync(async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
      throw new AppError(httpStatus.BAD_REQUEST, "Missing Stripe signature header");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        (req as unknown as { rawBody: Buffer }).rawBody ?? Buffer.from(""),
        sig,
        config.stripe.webhookSecret,
      );
    } catch (err) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Stripe webhook signature verification failed: ${(err as Error).message}`,
      );
    }

    const result = await paymentService.handleWebhook(event);
    res.status(httpStatus.OK).json({ success: true, ...result });
  }),
};

// Re-export express so the route file can pull the raw parser if it wants to.
export const webhookBodyParser = express.raw({ type: "application/json" });