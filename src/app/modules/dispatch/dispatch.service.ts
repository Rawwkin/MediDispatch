import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { sortByProximity } from "../../utils/distance";
import { writeAudit, extractAuditContext } from "../../utils/audit";
import { assertTransition } from "../../utils/stateMachine";
import {
  AmbulanceType,
  DispatchAssignmentStatus,
  EmergencyPriority,
  EmergencyStatus,
} from "../../../../generated/prisma/enums";
import type {
  IAssignAmbulance,
  IAvailableAmbulancesQuery,
  IReassignAmbulance,
  IUpdateDispatchStatus,
} from "./dispatch.interface";
import type { Prisma } from "../../../../generated/prisma/client";
import type { Request } from "express";

const PRIORITY_RANK: Record<EmergencyPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const priorityToAmbulanceType: Record<EmergencyPriority, AmbulanceType[]> = {
  CRITICAL: [AmbulanceType.ADVANCED_LIFE_SUPPORT, AmbulanceType.AIR_AMBULANCE],
  HIGH: [
    AmbulanceType.ADVANCED_LIFE_SUPPORT,
    AmbulanceType.BASIC_LIFE_SUPPORT,
  ],
  MEDIUM: [
    AmbulanceType.BASIC_LIFE_SUPPORT,
    AmbulanceType.PATIENT_TRANSPORT,
  ],
  LOW: [AmbulanceType.PATIENT_TRANSPORT, AmbulanceType.BASIC_LIFE_SUPPORT],
};

const ASSIGNMENT_INCLUDE = {
  id: true,
  note: true,
  status: true,
  emergencyRequest: {
    select: {
      id: true,
      emergencyType: true,
      priority: true,
      status: true,
      latitude: true,
      longitude: true,
      locationAddress: true,
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
  dispatcher: {
    select: { id: true, name: true, email: true },
  },
} as const;

export const dispatchService = {
  // ---------- Available ambulances ----------
  async availableAmbulances(query: IAvailableAmbulancesQuery) {
    let origin: { latitude: number; longitude: number } | undefined;
    let suggestedTypes: AmbulanceType[] | undefined;
    let priorityRank: number | undefined;

    if (query.emergencyId) {
      const emergency = await prisma.emergencyRequest.findUnique({
        where: { id: query.emergencyId, isDeleted: false },
        select: {
          latitude: true,
          longitude: true,
          priority: true,
          emergencyType: true,
        },
      });
      if (!emergency) {
        throw new AppError(httpStatus.NOT_FOUND, "Emergency not found");
      }
      origin = { latitude: emergency.latitude, longitude: emergency.longitude };
      const priority = query.priority ?? emergency.priority;
      suggestedTypes = priorityToAmbulanceType[priority as EmergencyPriority];
      priorityRank = PRIORITY_RANK[priority as EmergencyPriority] ?? 99;
    } else if (query.priority) {
      suggestedTypes = priorityToAmbulanceType[query.priority as EmergencyPriority];
      priorityRank = PRIORITY_RANK[query.priority as EmergencyPriority];
    }

    const ambulances = await prisma.ambulance.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        status: "AVAILABLE",
        ...(suggestedTypes && suggestedTypes.length > 0
          ? { type: { in: suggestedTypes } }
          : {}),
      },
      select: {
        id: true,
        registrationNumber: true,
        type: true,
        capacity: true,
        status: true,
        latitude: true,
        longitude: true,
        drivers: { where: { deletedAt: null, isActive: true } },
      },
    });

    const sorted = origin
      ? sortByProximity(origin, ambulances as { latitude: number; longitude: number }[])
      : ambulances.map((a: (typeof ambulances)[number]) => ({ ...a, distanceKm: undefined }));

    return { ambulances: sorted, priorityRank };
  },

  // ---------- Assign ----------
  async assignAmbulance(
    dispatcherId: string,
    emergencyId: string,
    payload: IAssignAmbulance,
    req?: Request,
  ) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const emergency = await tx.emergencyRequest.findUnique({
        where: { id: emergencyId },
        select: { id: true, status: true, priority: true, isDeleted: true },
      });
      if (!emergency || emergency.isDeleted) {
        throw new AppError(httpStatus.NOT_FOUND, "Emergency not found");
      }
      if (
        !["PENDING", "DISPATCHING"].includes(emergency.status) &&
        emergency.status !== EmergencyStatus.PENDING
      ) {
        throw new AppError(
          httpStatus.CONFLICT,
          `Emergency is in ${emergency.status} state and cannot be assigned an ambulance`,
        );
      }

      // Atomic check-and-set: only succeeds if ambulance is still AVAILABLE
      const updated = await tx.ambulance.updateMany({
        where: {
          id: payload.ambulanceId,
          isDeleted: false,
          isActive: true,
          status: "AVAILABLE",
        },
        data: { status: "RESERVED" },
      });
      if (updated.count === 0) {
        throw new AppError(
          httpStatus.CONFLICT,
          "Ambulance is not available for assignment",
        );
      }

      // Cancel any prior non-terminal assignments for this emergency
      await tx.dispatchAssignment.updateMany({
        where: {
          emergencyRequestId: emergencyId,
          status: {
            in: [
              DispatchAssignmentStatus.PENDING,
              DispatchAssignmentStatus.ACCEPTED,
            ],
          },
        },
        data: { status: DispatchAssignmentStatus.REASSIGNED, cancelledAt: new Date() },
      });

      const assignment = await tx.dispatchAssignment.create({
        data: {
          emergencyRequestId: emergencyId,
          ambulanceId: payload.ambulanceId,
          dispatcherId,
          status: DispatchAssignmentStatus.PENDING,
          note: payload.note,
        },
        select: ASSIGNMENT_INCLUDE,
      });

      // Move emergency forward: PENDING → DISPATCHING → ASSIGNED
      if (emergency.status === EmergencyStatus.PENDING) {
        await tx.emergencyStatusHistory.create({
          data: {
            emergencyRequestId: emergencyId,
            fromStatus: EmergencyStatus.PENDING,
            toStatus: EmergencyStatus.DISPATCHING,
            changedBy: dispatcherId,
            note: "Dispatcher began assignment",
          },
        });
      }
      await tx.emergencyRequest.update({
        where: { id: emergencyId },
        data: { status: EmergencyStatus.ASSIGNED },
      });
      await tx.emergencyStatusHistory.create({
        data: {
          emergencyRequestId: emergencyId,
          fromStatus:
            emergency.status === EmergencyStatus.PENDING
              ? EmergencyStatus.DISPATCHING
              : (emergency.status as EmergencyStatus),
          toStatus: EmergencyStatus.ASSIGNED,
          changedBy: dispatcherId,
          note: `Assigned ambulance ${payload.ambulanceId}`,
        },
      });

      // Create the trip up-front so downstream endpoints can use it
      const existingTrip = await tx.trip.findUnique({
        where: { emergencyRequestId: emergencyId },
        select: { id: true },
      });
      if (!existingTrip) {
        await tx.trip.create({
          data: {
            emergencyRequestId: emergencyId,
            ambulanceId: payload.ambulanceId,
            status: "NOT_STARTED",
          },
        });
      } else {
        // Reassign: re-point the trip to the new ambulance
        await tx.trip.update({
          where: { emergencyRequestId: emergencyId },
          data: { ambulanceId: payload.ambulanceId },
        });
      }

      const { ipAddress, userAgent } = extractAuditContext(req);
      await writeAudit(tx, {
        userId: dispatcherId,
        action: "ASSIGN_AMBULANCE",
        entity: "DispatchAssignment",
        entityId: assignment.id,
        newValue: {
          emergencyId,
          ambulanceId: payload.ambulanceId,
        },
        ipAddress,
        userAgent,
      });

      return assignment;
    });
  },

  // ---------- Reassign ----------
  async reassignAmbulance(
    dispatcherId: string,
    assignmentId: string,
    payload: IReassignAmbulance,
    req?: Request,
  ) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const old = await tx.dispatchAssignment.findUnique({
        where: { id: assignmentId },
        select: {
          id: true,
          emergencyRequestId: true,
          ambulanceId: true,
          status: true,
        },
      });
      if (!old) {
        throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
      }
      if (
        (
          [
            DispatchAssignmentStatus.CANCELLED,
            DispatchAssignmentStatus.COMPLETED,
            DispatchAssignmentStatus.REASSIGNED,
          ] as DispatchAssignmentStatus[]
        ).includes(old.status)
      ) {
        throw new AppError(
          httpStatus.CONFLICT,
          "Cannot reassign a closed assignment",
        );
      }
      if (old.ambulanceId === payload.newAmbulanceId) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "New ambulance must be different from the current one",
        );
      }

      // Reserve the new ambulance atomically
      const updated = await tx.ambulance.updateMany({
        where: {
          id: payload.newAmbulanceId,
          isDeleted: false,
          isActive: true,
          status: "AVAILABLE",
        },
        data: { status: "RESERVED" },
      });
      if (updated.count === 0) {
        throw new AppError(
          httpStatus.CONFLICT,
          "New ambulance is not available for assignment",
        );
      }

      // Free the previously reserved ambulance
      await tx.ambulance.update({
        where: { id: old.ambulanceId },
        data: { status: "AVAILABLE" },
      });

      // Mark old assignment as reassigned
      await tx.dispatchAssignment.update({
        where: { id: assignmentId },
        data: {
          status: DispatchAssignmentStatus.REASSIGNED,
          cancelledAt: new Date(),
        },
      });

      const newAssignment = await tx.dispatchAssignment.create({
        data: {
          emergencyRequestId: old.emergencyRequestId,
          ambulanceId: payload.newAmbulanceId,
          dispatcherId,
          status: DispatchAssignmentStatus.PENDING,
          note: payload.note,
        },
        select: ASSIGNMENT_INCLUDE,
      });

      // Repoint trip
      await tx.trip.update({
        where: { emergencyRequestId: old.emergencyRequestId },
        data: { ambulanceId: payload.newAmbulanceId },
      });

      const { ipAddress, userAgent } = extractAuditContext(req);
      await writeAudit(tx, {
        userId: dispatcherId,
        action: "REASSIGN_AMBULANCE",
        entity: "DispatchAssignment",
        entityId: newAssignment.id,
        oldValue: { ambulanceId: old.ambulanceId, assignmentId: old.id },
        newValue: { ambulanceId: payload.newAmbulanceId },
        ipAddress,
        userAgent,
      });

      return newAssignment;
    });
  },

  // ---------- Update status ----------
  async updateAssignmentStatus(
    dispatcherId: string,
    assignmentId: string,
    payload: IUpdateDispatchStatus,
    req?: Request,
  ) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const before = await tx.dispatchAssignment.findUnique({
        where: { id: assignmentId },
        select: {
          id: true,
          emergencyRequestId: true,
          ambulanceId: true,
          status: true,
          note: true,
        },
      });
      if (!before) {
        throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
      }

      // Assignment state machine
      assertTransition(
        {
          PENDING: ["ACCEPTED", "EN_ROUTE", "CANCELLED", "REASSIGNED"],
          ACCEPTED: ["EN_ROUTE", "CANCELLED", "REASSIGNED"],
          EN_ROUTE: ["AT_SCENE", "CANCELLED"],
          AT_SCENE: ["PATIENT_ONBOARD", "CANCELLED"],
          PATIENT_ONBOARD: ["AT_HOSPITAL", "CANCELLED"],
          AT_HOSPITAL: ["COMPLETED"],
          COMPLETED: [],
          CANCELLED: [],
          REASSIGNED: [],
        },
        before.status,
        payload.status,
        "DispatchAssignment",
      );

      const updated = await tx.dispatchAssignment.update({
        where: { id: assignmentId },
        data: {
          status: payload.status,
          acceptedAt:
            payload.status === DispatchAssignmentStatus.ACCEPTED
              ? new Date()
              : undefined,
          cancelledAt:
            payload.status === DispatchAssignmentStatus.CANCELLED
              ? new Date()
              : undefined,
          note: payload.note ?? before.note,
        },
        select: ASSIGNMENT_INCLUDE,
      });

      // Drive emergency + ambulance + trip states in lock-step
      const emergencyId = before.emergencyRequestId;
      const ambulanceId = before.ambulanceId;

      const emergencyStatus = mapAssignmentToEmergency(payload.status);
      if (emergencyStatus) {
        const current = await tx.emergencyRequest.findUnique({
          where: { id: emergencyId },
          select: { status: true },
        });
        if (current) {
          assertTransition(
            {
              PENDING: ["DISPATCHING", "CANCELLED"],
              DISPATCHING: ["ASSIGNED", "CANCELLED"],
              ASSIGNED: ["EN_ROUTE", "CANCELLED"],
              EN_ROUTE: ["ARRIVED"],
              ARRIVED: ["PICKED_UP"],
              PICKED_UP: ["HOSPITAL_SELECTED"],
              HOSPITAL_SELECTED: ["HOSPITAL_ARRIVED"],
              HOSPITAL_ARRIVED: ["COMPLETED"],
              COMPLETED: [],
              CANCELLED: [],
            },
            current.status,
            emergencyStatus,
            "EmergencyRequest",
          );
          await tx.emergencyRequest.update({
            where: { id: emergencyId },
            data: { status: emergencyStatus },
          });
          await tx.emergencyStatusHistory.create({
            data: {
              emergencyRequestId: emergencyId,
              fromStatus: current.status,
              toStatus: emergencyStatus,
              changedBy: dispatcherId,
              note: `Assignment ${assignmentId} → ${payload.status}`,
            },
          });
        }
      }

      const ambulanceStatus = mapAssignmentToAmbulance(payload.status);
      if (ambulanceStatus) {
        await tx.ambulance.update({
          where: { id: ambulanceId },
          data: { status: ambulanceStatus },
        });
      }

      const tripStatus = mapAssignmentToTrip(payload.status);
      if (tripStatus) {
        const trip = await tx.trip.findUnique({
          where: { emergencyRequestId: emergencyId },
        });
        if (trip) {
          const now = new Date();
          await tx.trip.update({
            where: { id: trip.id },
            data: {
              status: tripStatus,
              enRouteAt: tripStatus === "EN_ROUTE" ? now : trip.enRouteAt,
              atSceneAt: tripStatus === "AT_SCENE" ? now : trip.atSceneAt,
              pickedUpAt:
                tripStatus === "PATIENT_ONBOARD" ? now : trip.pickedUpAt,
              hospitalArrivedAt:
                tripStatus === "AT_HOSPITAL" ? now : trip.hospitalArrivedAt,
              completedAt: tripStatus === "COMPLETED" ? now : trip.completedAt,
            },
          });
        }
      }

      const { ipAddress, userAgent } = extractAuditContext(req);
      await writeAudit(tx, {
        userId: dispatcherId,
        action: "UPDATE_ASSIGNMENT_STATUS",
        entity: "DispatchAssignment",
        entityId: assignmentId,
        oldValue: { status: before.status },
        newValue: { status: payload.status },
        ipAddress,
        userAgent,
      });

      return updated;
    });
  },

  async listAssignments(query: Record<string, unknown>) {
    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 10), 100);
    const skip = (page - 1) * limit;
    const sortBy = (query.sortBy as string) ?? "assignedAt";
    const sortOrder =
      String(query.sortOrder ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const allowedSort = ["assignedAt", "status"];
    const sort = allowedSort.includes(sortBy) ? sortBy : "assignedAt";

    const where: Prisma.DispatchAssignmentWhereInput = {};
    if (query.status) where.status = query.status as DispatchAssignmentStatus;
    if (query.emergencyId) where.emergencyRequestId = String(query.emergencyId);
    if (query.ambulanceId) where.ambulanceId = String(query.ambulanceId);
    if (query.dispatcherId) where.dispatcherId = String(query.dispatcherId);

    const [items, total] = await prisma.$transaction([
      prisma.dispatchAssignment.findMany({
        where,
        select: ASSIGNMENT_INCLUDE,
        orderBy: { [sort]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.dispatchAssignment.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  },
};

// ---- Mapping helpers ----
const mapAssignmentToEmergency = (
  s: DispatchAssignmentStatus,
): EmergencyStatus | null => {
  switch (s) {
    case DispatchAssignmentStatus.EN_ROUTE:
      return EmergencyStatus.EN_ROUTE;
    case DispatchAssignmentStatus.AT_SCENE:
      return EmergencyStatus.ARRIVED;
    case DispatchAssignmentStatus.PATIENT_ONBOARD:
      return EmergencyStatus.PICKED_UP;
    case DispatchAssignmentStatus.AT_HOSPITAL:
      return EmergencyStatus.HOSPITAL_SELECTED;
    case DispatchAssignmentStatus.COMPLETED:
      return EmergencyStatus.COMPLETED;
    default:
      return null;
  }
};

const mapAssignmentToAmbulance = (
  s: DispatchAssignmentStatus,
):
  | "EN_ROUTE"
  | "AT_SCENE"
  | "PATIENT_ONBOARD"
  | "AT_HOSPITAL"
  | "AVAILABLE"
  | null => {
  switch (s) {
    case DispatchAssignmentStatus.EN_ROUTE:
      return "EN_ROUTE";
    case DispatchAssignmentStatus.AT_SCENE:
      return "AT_SCENE";
    case DispatchAssignmentStatus.PATIENT_ONBOARD:
      return "PATIENT_ONBOARD";
    case DispatchAssignmentStatus.AT_HOSPITAL:
      return "AT_HOSPITAL";
    case DispatchAssignmentStatus.COMPLETED:
    case DispatchAssignmentStatus.CANCELLED:
    case DispatchAssignmentStatus.REASSIGNED:
      return "AVAILABLE";
    default:
      return null;
  }
};

const mapAssignmentToTrip = (
  s: DispatchAssignmentStatus,
):
  | "EN_ROUTE"
  | "AT_SCENE"
  | "PATIENT_ONBOARD"
  | "AT_HOSPITAL"
  | "COMPLETED"
  | null => {
  switch (s) {
    case DispatchAssignmentStatus.EN_ROUTE:
      return "EN_ROUTE";
    case DispatchAssignmentStatus.AT_SCENE:
      return "AT_SCENE";
    case DispatchAssignmentStatus.PATIENT_ONBOARD:
      return "PATIENT_ONBOARD";
    case DispatchAssignmentStatus.AT_HOSPITAL:
      return "AT_HOSPITAL";
    case DispatchAssignmentStatus.COMPLETED:
      return "COMPLETED";
    default:
      return null;
  }
};