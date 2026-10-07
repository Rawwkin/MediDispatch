import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { stripe } from "../../lib/stripe";
import config from "../../config";
import { writeAudit, extractAuditContext } from "../../utils/audit";
import { PaymentStatus, TripStatus } from "../../../../generated/prisma/enums";
import type Stripe from "stripe";
import type { ICreatePayment } from "./payment.interface";
import type { Request } from "express";

const SAFE_PAYMENT_SELECT = {
  id: true,
  tripId: true,
  userId: true,
  amount: true,
  currency: true,
  provider: true,
  status: true,
  sessionId: true,
  transactionId: true,
  failureMessage: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const PAYMENT_INCLUDE = {
  ...SAFE_PAYMENT_SELECT,
  trip: {
    select: {
      id: true,
      emergencyRequestId: true,
      status: true,
      finalFare: true,
      estimatedFare: true,
      currency: true,
      distance: true,
      ambulance: {
        select: {
          id: true,
          registrationNumber: true,
          type: true,
        },
      },
      hospital: true,
    },
  },
  user: {
    select: { id: true, name: true, email: true },
  },
} as const;

const computeAmount = (trip: {
  finalFare: number | null;
  estimatedFare: number | null;
}): number => {
  const amount = trip.finalFare ?? trip.estimatedFare;
  if (amount === null || amount === undefined || amount <= 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Trip has no fare set. Complete the trip before paying.",
    );
  }
  return Number(amount);
};

export const paymentService = {
  async createCheckoutSession(
    userId: string,
    payload: ICreatePayment,
    req?: Request,
  ) {
    const trip = await prisma.trip.findUnique({
      where: { id: payload.tripId },
      select: {
        id: true,
        emergencyRequestId: true,
        status: true,
        finalFare: true,
        estimatedFare: true,
        currency: true,
        emergencyRequest: { select: { callerId: true } },
        payment: true,
      },
    });

    if (!trip) {
      throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
    }

    if (trip.emergencyRequest.callerId !== userId) {
      throw new AppError(httpStatus.FORBIDDEN, "Access denied");
    }

    if (trip.status !== TripStatus.COMPLETED) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Payment can only be initiated for completed trips (current: ${trip.status})`,
      );
    }

    if (trip.payment && trip.payment.status === PaymentStatus.PAID) {
      throw new AppError(
        httpStatus.CONFLICT,
        "This trip has already been paid for",
      );
    }

    const amount = computeAmount(trip);
    const currency = (trip.currency ?? config.stripe.currency).toLowerCase();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `Ambulance trip ${trip.id}`,
              description: `Emergency dispatch payment for trip ${trip.id}`,
            },
          },
        },
      ],
      success_url: `${config.clientUrl}/payment-success?tripId=${trip.id}`,
      cancel_url: `${config.clientUrl}/payment-cancel?tripId=${trip.id}`,
      metadata: {
        tripId: trip.id,
        userId,
        emergencyRequestId: trip.emergencyRequestId,
      },
    });

    const payment = await prisma.payment.upsert({
      where: { tripId: trip.id },
      create: {
        tripId: trip.id,
        userId,
        amount,
        currency,
        provider: "STRIPE",
        status: "PROCESSING",
        sessionId: session.id,
      },
      update: {
        amount,
        currency,
        sessionId: session.id,
        status: "PROCESSING",
      },
      select: PAYMENT_INCLUDE,
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId,
      action: "PAYMENT_INITIATED",
      entity: "Payment",
      entityId: payment.id,
      newValue: { tripId: trip.id, amount, currency },
      ipAddress,
      userAgent,
    });

    return {
      paymentId: payment.id,
      sessionId: session.id,
      checkoutUrl: session.url,
      amount,
      currency,
    };
  },

  async getById(actorRole: string, actorId: string, id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      select: PAYMENT_INCLUDE,
    });
    if (!payment) {
      throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
    }
    if (actorRole === "CALLER" && payment.userId !== actorId) {
      throw new AppError(httpStatus.FORBIDDEN, "Access denied");
    }
    return payment;
  },

  async listMyPayments(actorId: string) {
    const items = await prisma.payment.findMany({
      where: { userId: actorId },
      orderBy: { createdAt: "desc" },
      select: PAYMENT_INCLUDE,
    });
    return { items };
  },

  async listAllPayments() {
    const items = await prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      select: PAYMENT_INCLUDE,
    });
    return { items };
  },

  /**
   * Idempotent webhook handler.
   * Verifies the Stripe signature, finds the corresponding payment, and
   * updates its status atomically. Returns the same response for duplicates.
   */
  async handleWebhook(event: Stripe.Event) {
    const updateBySession = async (sessionId: string, status: PaymentStatus, extra: Record<string, unknown> = {}) =>
      prisma.payment
        .update({
          where: { sessionId },
          data: { status, ...extra },
          select: SAFE_PAYMENT_SELECT,
        })
        .catch(() => null);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const payment = await prisma.payment.findUnique({
          where: { sessionId: session.id },
        });
        if (!payment) return { received: true, matched: false };
        if (payment.status === PaymentStatus.PAID) {
          return { received: true, idempotent: true };
        }
        const updated = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            transactionId: String(session.payment_intent ?? ""),
            paidAt: new Date(),
          },
          select: SAFE_PAYMENT_SELECT,
        });
        await writeAudit(prisma, {
          action: "PAYMENT_STATUS_CHANGE",
          entity: "Payment",
          entityId: updated.id,
          oldValue: { status: payment.status },
          newValue: { status: PaymentStatus.PAID },
        });
        return { received: true, status: PaymentStatus.PAID };
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const updated = await updateBySession(session.id, PaymentStatus.CANCELLED, { failureMessage: "Stripe session expired" });
        return { received: true, payment: updated };
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const updated = await prisma.payment
          .update({
            where: { transactionId: intent.id },
            data: {
              status: PaymentStatus.FAILED,
              failureMessage: intent.last_payment_error?.message ?? "Payment failed",
            },
            select: SAFE_PAYMENT_SELECT,
          })
          .catch(() => null);
        return { received: true, payment: updated };
      }
      default:
        return { received: true, ignored: true };
    }
  },
};