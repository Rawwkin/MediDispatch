import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildMeta, parsePagination } from "../../utils/pagination";
import { writeAudit, extractAuditContext } from "../../utils/audit";
import { suggestPriority } from "./priority.service";
import { UserRole } from "../../../../generated/prisma/enums";
import type {
  ICreateEmergency,
  IEmergencyListQuery,
  IUpdateEmergency,
} from "./emergency.interface";
import type { Request } from "express";
import type { Prisma } from "../../../../generated/prisma/client";

const SAFE_EMERGENCY_SELECT = {
  id: true,
  callerId: true,
  emergencyType: true,
  priority: true,
  status: true,
  description: true,
  locationAddress: true,
  latitude: true,
  longitude: true,
  contactPhone: true,
  contactName: true,
  cancelledReason: true,
  cancelledBy: true,
  isDeleted: true,
createdAt: true,
  updatedAt: true,
} as const;

export const emergencyService = {
  async create(
    callerId: string,
    payload: ICreateEmergency,
    req?: Request,
  ) {
    const priority =
      payload.priority ??
      suggestPriority(payload.emergencyType, payload.description);

    const emergency = await prisma.emergencyRequest.create({
      data: {
        callerId,
        emergencyType: payload.emergencyType,
        description: payload.description,
        priority,
        latitude: payload.latitude,
        longitude: payload.longitude,
        locationAddress: payload.locationAddress,
        contactPhone: payload.contactPhone,
        contactName: payload.contactName,
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: "PENDING",
            changedBy: callerId,
            note: "Emergency created",
          },
        },
      },
      select: { ...SAFE_EMERGENCY_SELECT, statusHistory: true },
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: callerId,
      action: "CREATE_EMERGENCY",
      entity: "EmergencyRequest",
      entityId: emergency.id,
      newValue: {
        emergencyType: emergency.emergencyType,
        priority: emergency.priority,
      },
      ipAddress,
      userAgent,
    });

    return emergency;
  },

  async list(
    actorRole: string,
    actorId: string,
    query: Record<string, unknown> & IEmergencyListQuery,
  ) {
    const { page, limit, skip, sortBy, sortOrder } = parsePagination(query);

    const where: Record<string, unknown> = { isDeleted: false };
    // Callers can only see their own emergencies.
    if (actorRole === UserRole.CALLER) {
      where.callerId = actorId;
    }
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.type) where.emergencyType = query.type;
    if (query.search) {
      where.OR = [
        { description: { contains: String(query.search), mode: "insensitive" } },
        { locationAddress: { contains: String(query.search), mode: "insensitive" } },
        { contactName: { contains: String(query.search), mode: "insensitive" } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.emergencyRequest.findMany({
        where,
        select: SAFE_EMERGENCY_SELECT,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.emergencyRequest.count({ where }),
    ]);

    return { items, meta: buildMeta(total, page, limit) };
  },

  async getById(actorRole: string, actorId: string, id: string) {
    const emergency = await prisma.emergencyRequest.findUnique({
      where: { id },
      select: {
        ...SAFE_EMERGENCY_SELECT,
        caller: {
          select: { id: true, name: true, email: true, phone: true },
        },
        statusHistory: { orderBy: { createdAt: "asc" } },
        assignments: {
          select: {
            id: true,
            status: true,
            assignedAt: true,
            acceptedAt: true,
            cancelledAt: true,
            note: true,
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
          },
          orderBy: { assignedAt: "asc" },
        },
        trip: true,
      },
    });

    if (!emergency || emergency.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "Emergency not found");
    }

    if (actorRole === UserRole.CALLER && emergency.callerId !== actorId) {
      throw new AppError(httpStatus.FORBIDDEN, "Access denied");
    }

    return emergency;
  },

  async update(
    actorRole: string,
    actorId: string,
    id: string,
    payload: IUpdateEmergency,
    req?: Request,
  ) {
    const before = await prisma.emergencyRequest.findUnique({ where: { id } });
    if (!before || before.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "Emergency not found");
    }

    if (
      actorRole === UserRole.CALLER &&
      before.callerId !== actorId
    ) {
      throw new AppError(httpStatus.FORBIDDEN, "Access denied");
    }

    if (actorRole === UserRole.CALLER && before.status !== "PENDING") {
      throw new AppError(
        httpStatus.CONFLICT,
        "Emergencies can only be edited while pending. Contact dispatcher for changes.",
      );
    }

    if (payload.priority && actorRole === UserRole.CALLER) {
      // Callers may propose priority, but the dispatcher is the authority.
      // We still store the request; dispatch workflow re-asserts.
    }

    const updated = await prisma.emergencyRequest.update({
      where: { id },
      data: payload,
      select: SAFE_EMERGENCY_SELECT,
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: actorId,
      action: "UPDATE_EMERGENCY",
      entity: "EmergencyRequest",
      entityId: id,
      oldValue: before,
      newValue: updated,
      ipAddress,
      userAgent,
    });

    return updated;
  },

  async cancel(
    actorRole: string,
    actorId: string,
    id: string,
    reason: string | undefined,
    req?: Request,
  ) {
    const before = await prisma.emergencyRequest.findUnique({ where: { id } });
    if (!before || before.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "Emergency not found");
    }

    if (actorRole === UserRole.CALLER) {
      if (before.callerId !== actorId) {
        throw new AppError(httpStatus.FORBIDDEN, "Access denied");
      }
      if (!["PENDING", "DISPATCHING"].includes(before.status)) {
        throw new AppError(
          httpStatus.CONFLICT,
          "Emergency can no longer be cancelled at its current stage",
        );
      }
    } else if (actorRole !== UserRole.DISPATCHER && actorRole !== UserRole.ADMIN) {
      throw new AppError(httpStatus.FORBIDDEN, "Access denied");
    } else if (["COMPLETED", "CANCELLED"].includes(before.status)) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Emergency is already ${before.status.toLowerCase()}`,
      );
    }

    const cancelledBy =
      actorRole === UserRole.CALLER ? "CALLER" : "DISPATCHER";

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const result = await tx.emergencyRequest.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledReason: reason ?? null,
          cancelledBy,
        },
        select: SAFE_EMERGENCY_SELECT,
      });

      await tx.emergencyStatusHistory.create({
        data: {
          emergencyRequestId: id,
          fromStatus: before.status,
          toStatus: "CANCELLED",
          changedBy: actorId,
          note: reason ?? `Cancelled by ${cancelledBy.toLowerCase()}`,
        },
      });

      // Mark any pending assignments as cancelled too
      await tx.dispatchAssignment.updateMany({
        where: {
          emergencyRequestId: id,
          status: { in: ["PENDING", "ACCEPTED"] },
        },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });

      return result;
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: actorId,
      action: "CANCEL_EMERGENCY",
      entity: "EmergencyRequest",
      entityId: id,
      oldValue: { status: before.status },
      newValue: { status: "CANCELLED", reason },
      ipAddress,
      userAgent,
    });

    return updated;
  },

  async softDelete(actorId: string, id: string, req?: Request) {
    const before = await prisma.emergencyRequest.findUnique({ where: { id } });
    if (!before || before.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "Emergency not found");
    }

    await prisma.emergencyRequest.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: actorId,
      action: "DELETE_EMERGENCY",
      entity: "EmergencyRequest",
      entityId: id,
      ipAddress,
      userAgent,
    });

    return { id, deletedAt: new Date() };
  },
};