import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildMeta, parsePagination } from "../../utils/pagination";
import { writeAudit, extractAuditContext } from "../../utils/audit";
import { assertTransition, EMERGENCY_TRANSITIONS } from "../../utils/stateMachine";
import { haversineKm } from "../../utils/distance";
import config from "../../config";
import { TripStatus, EmergencyStatus } from "../../../../generated/prisma/enums";
import type { ISelectHospital, IUpdateTripStatus } from "./trip.interface";
import type { Request } from "express";
import type { Prisma } from "../../../../generated/prisma/client";

// Simple fare model: base + per-km. Estimated in USD.
const FARE_BASE = 25;
const FARE_PER_KM = 1.5;

const computeEstimatedFare = (distanceKm: number): number => {
  return Number((FARE_BASE + FARE_PER_KM * distanceKm).toFixed(2));
};

const TRIP_INCLUDE = {
  emergencyRequest: {
    select: {
      id: true,
      emergencyType: true,
      priority: true,
      status: true,
      latitude: true,
      longitude: true,
      locationAddress: true,
      caller: { select: { id: true, name: true, email: true, phone: true } },
    },
  },
  ambulance: {
    select: {
      id: true,
      registrationNumber: true,
      type: true,
      status: true,
      latitude: true,
      longitude: true,
    },
  },
  hospital: true,
  payment: true,
} as const;

export const tripService = {
  async list(actorRole: string, actorId: string, query: Record<string, unknown>) {
    const { page, limit, skip, sortBy, sortOrder } = parsePagination(query);
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.emergencyId) where.emergencyRequestId = query.emergencyId;

    if (actorRole === "CALLER") {
      where.emergencyRequest = { callerId: actorId };
    }

    const [items, total] = await prisma.$transaction([
      prisma.trip.findMany({
        where,
        select: TRIP_INCLUDE,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.trip.count({ where }),
    ]);

    return { items, meta: buildMeta(total, page, limit) };
  },

  async getById(actorRole: string, actorId: string, id: string) {
    const trip = await prisma.trip.findUnique({
      where: { id },
      select: {
        ...TRIP_INCLUDE,
        emergencyRequest: {
          select: {
            ...TRIP_INCLUDE.emergencyRequest.select,
            caller: TRIP_INCLUDE.emergencyRequest.select.caller,
          },
        },
      },
    });
    if (!trip) {
      throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
    }

    // Caller must own the emergency
    if (
      actorRole === "CALLER" &&
      trip.emergencyRequest.caller.id !== actorId
    ) {
      throw new AppError(httpStatus.FORBIDDEN, "Access denied");
    }

    return trip;
  },

  async selectHospital(
    actorId: string,
    tripId: string,
    payload: ISelectHospital,
    req?: Request,
  ) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        select: {
          id: true,
          status: true,
          ambulanceId: true,
          emergencyRequestId: true,
          emergencyRequest: {
            select: {
              id: true,
              status: true,
              latitude: true,
              longitude: true,
            },
          },
        },
      });
      if (!trip) {
        throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
      }

      if (
        !["PATIENT_ONBOARD", "AT_HOSPITAL", "HOSPITAL_SELECTED"].includes(
          trip.status,
        )
      ) {
        throw new AppError(
          httpStatus.CONFLICT,
          `Cannot select a hospital while the trip is ${trip.status}`,
        );
      }

      const hospital = await tx.hospital.findUnique({
        where: { id: payload.hospitalId },
      });
      if (!hospital || hospital.isDeleted || !hospital.isActive) {
        throw new AppError(httpStatus.BAD_REQUEST, "Hospital not available");
      }

      // Estimate distance + fare (final fare may be set by dispatcher later)
      let distance = 0;
      let estimatedFare = FARE_BASE;
      if (
        hospital.latitude !== null &&
        hospital.longitude !== null &&
        trip.ambulanceId
      ) {
        const ambulance = await tx.ambulance.findUnique({
          where: { id: trip.ambulanceId },
          select: { latitude: true, longitude: true },
        });
        if (
          ambulance &&
          ambulance.latitude !== null &&
          ambulance.longitude !== null
        ) {
          distance = haversineKm(
            ambulance.latitude,
            ambulance.longitude,
            hospital.latitude,
            hospital.longitude,
          );
          estimatedFare = computeEstimatedFare(distance);
        }
      }

      // Validate emergency transition
      assertTransition(
        EMERGENCY_TRANSITIONS,
        trip.emergencyRequest.status,
        EmergencyStatus.HOSPITAL_SELECTED,
        "EmergencyRequest",
      );

      await tx.emergencyRequest.update({
        where: { id: trip.emergencyRequestId },
        data: { status: EmergencyStatus.HOSPITAL_SELECTED },
      });
      await tx.emergencyStatusHistory.create({
        data: {
          emergencyRequestId: trip.emergencyRequestId,
          fromStatus: trip.emergencyRequest.status,
          toStatus: EmergencyStatus.HOSPITAL_SELECTED,
          changedBy: actorId,
          note: `Hospital selected: ${hospital.name}`,
        },
      });

      const updated = await tx.trip.update({
        where: { id: tripId },
        data: {
          hospitalId: payload.hospitalId,
          distance,
          estimatedFare,
          currency: config.stripe.currency,
        },
        select: TRIP_INCLUDE,
      });

      const { ipAddress, userAgent } = extractAuditContext(req);
      await writeAudit(tx, {
        userId: actorId,
        action: "SELECT_HOSPITAL",
        entity: "Trip",
        entityId: tripId,
        newValue: { hospitalId: payload.hospitalId, estimatedFare, distance },
        ipAddress,
        userAgent,
      });

      return updated;
    });
  },

  async updateStatus(
    actorId: string,
    tripId: string,
    payload: IUpdateTripStatus,
    req?: Request,
  ) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const before = await tx.trip.findUnique({
        where: { id: tripId },
        select: { id: true, status: true, emergencyRequestId: true },
      });
      if (!before) {
        throw new AppError(httpStatus.NOT_FOUND, "Trip not found");
      }

      assertTransition(
        {
          NOT_STARTED: ["EN_ROUTE"],
          EN_ROUTE: ["AT_SCENE"],
          AT_SCENE: ["PATIENT_ONBOARD"],
          PATIENT_ONBOARD: ["AT_HOSPITAL", "CANCELLED"],
          AT_HOSPITAL: ["COMPLETED"],
          COMPLETED: [],
          CANCELLED: [],
        },
        before.status,
        payload.status,
        "Trip",
      );

      const now = new Date();
      const updated = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: payload.status,
          distance: payload.distance,
          finalFare: payload.finalFare,
          startedAt:
            before.status === "NOT_STARTED" && payload.status === "EN_ROUTE"
              ? now
              : undefined,
          enRouteAt: payload.status === "EN_ROUTE" ? now : undefined,
          atSceneAt: payload.status === "AT_SCENE" ? now : undefined,
          pickedUpAt: payload.status === "PATIENT_ONBOARD" ? now : undefined,
          hospitalArrivedAt:
            payload.status === "AT_HOSPITAL" ? now : undefined,
          completedAt: payload.status === "COMPLETED" ? now : undefined,
        },
        select: TRIP_INCLUDE,
      });

      const emergencyStatus = mapTripToEmergency(payload.status);
      if (emergencyStatus) {
        const current = await tx.emergencyRequest.findUnique({
          where: { id: before.emergencyRequestId },
          select: { status: true },
        });
        if (current && current.status !== emergencyStatus) {
          assertTransition(
            EMERGENCY_TRANSITIONS,
            current.status,
            emergencyStatus,
            "EmergencyRequest",
          );
          await tx.emergencyRequest.update({
            where: { id: before.emergencyRequestId },
            data: { status: emergencyStatus },
          });
          await tx.emergencyStatusHistory.create({
            data: {
              emergencyRequestId: before.emergencyRequestId,
              fromStatus: current.status,
              toStatus: emergencyStatus,
              changedBy: actorId,
              note: `Trip ${tripId} → ${payload.status}`,
            },
          });
        }
      }

      const { ipAddress, userAgent } = extractAuditContext(req);
      await writeAudit(tx, {
        userId: actorId,
        action: "UPDATE_TRIP_STATUS",
        entity: "Trip",
        entityId: tripId,
        oldValue: { status: before.status },
        newValue: { status: payload.status },
        ipAddress,
        userAgent,
      });

      return updated;
    });
  },
};

const mapTripToEmergency = (
  s: TripStatus,
): EmergencyStatus | null => {
  switch (s) {
    case TripStatus.EN_ROUTE:
      return EmergencyStatus.EN_ROUTE;
    case TripStatus.AT_SCENE:
      return EmergencyStatus.ARRIVED;
    case TripStatus.PATIENT_ONBOARD:
      return EmergencyStatus.PICKED_UP;
    case TripStatus.AT_HOSPITAL:
      return EmergencyStatus.HOSPITAL_ARRIVED;
    case TripStatus.COMPLETED:
      return EmergencyStatus.COMPLETED;
    default:
      return null;
  }
};