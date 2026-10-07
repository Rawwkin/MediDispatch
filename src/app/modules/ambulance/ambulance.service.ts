import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildMeta, parsePagination } from "../../utils/pagination";
import { writeAudit, extractAuditContext } from "../../utils/audit";
import { sortByProximity } from "../../utils/distance";
import type { ICreateAmbulance, IUpdateAmbulance } from "./ambulance.interface";
import type { Request } from "express";

const SAFE_AMBULANCE_SELECT = {
  id: true,
  registrationNumber: true,
  type: true,
  capacity: true,
  status: true,
  latitude: true,
  longitude: true,
  isActive: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const ambulanceService = {
  async create(payload: ICreateAmbulance, req?: Request) {
    const exists = await prisma.ambulance.findUnique({
      where: { registrationNumber: payload.registrationNumber },
    });
    if (exists) {
      throw new AppError(
        httpStatus.CONFLICT,
        "An ambulance with this registration number already exists",
      );
    }

    const ambulance = await prisma.ambulance.create({
      data: {
        registrationNumber: payload.registrationNumber,
        type: payload.type,
        capacity: payload.capacity ?? 2,
        status: payload.status ?? "AVAILABLE",
        latitude: payload.latitude,
        longitude: payload.longitude,
        isActive: payload.isActive ?? true,
      },
      select: SAFE_AMBULANCE_SELECT,
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: req?.user?.id,
      action: "CREATE_AMBULANCE",
      entity: "Ambulance",
      entityId: ambulance.id,
      newValue: ambulance,
      ipAddress,
      userAgent,
    });

    return ambulance;
  },

  async list(query: Record<string, unknown>) {
    const { page, limit, skip, sortBy, sortOrder } = parsePagination(query);
    const where: Record<string, unknown> = { isDeleted: false };
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.registrationNumber = {
        contains: String(query.search),
        mode: "insensitive",
      };
    }

    const [items, total] = await prisma.$transaction([
      prisma.ambulance.findMany({
        where,
        select: { ...SAFE_AMBULANCE_SELECT, drivers: { where: { deletedAt: null } } },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.ambulance.count({ where }),
    ]);

    return { items, meta: buildMeta(total, page, limit) };
  },

  async listAvailable(origin?: { latitude: number; longitude: number }) {
    const items = await prisma.ambulance.findMany({
      where: { isDeleted: false, isActive: true, status: "AVAILABLE" },
      select: SAFE_AMBULANCE_SELECT,
    });
    if (!origin) return items;
    return sortByProximity(origin, items as { latitude: number; longitude: number }[]);
  },

  async getById(id: string) {
    const ambulance = await prisma.ambulance.findUnique({
      where: { id },
      select: {
        ...SAFE_AMBULANCE_SELECT,
        drivers: { where: { deletedAt: null } },
      },
    });
    if (!ambulance || ambulance.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "Ambulance not found");
    }
    return ambulance;
  },

  async update(id: string, payload: IUpdateAmbulance, req?: Request) {
    const before = await prisma.ambulance.findUnique({ where: { id } });
    if (!before || before.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "Ambulance not found");
    }

    if (payload.registrationNumber && payload.registrationNumber !== before.registrationNumber) {
      const dup = await prisma.ambulance.findUnique({
        where: { registrationNumber: payload.registrationNumber },
      });
      if (dup) {
        throw new AppError(
          httpStatus.CONFLICT,
          "Another ambulance already uses this registration number",
        );
      }
    }

    const updated = await prisma.ambulance.update({
      where: { id },
      data: payload,
      select: SAFE_AMBULANCE_SELECT,
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: req?.user?.id,
      action: "UPDATE_AMBULANCE",
      entity: "Ambulance",
      entityId: id,
      oldValue: before,
      newValue: updated,
      ipAddress,
      userAgent,
    });

    return updated;
  },

  async softDelete(id: string, req?: Request) {
    const before = await prisma.ambulance.findUnique({ where: { id } });
    if (!before || before.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "Ambulance not found");
    }
    if (before.status !== "AVAILABLE" && before.status !== "OFFLINE" && before.status !== "MAINTENANCE") {
      throw new AppError(
        httpStatus.CONFLICT,
        "Cannot delete an ambulance that is currently on a trip",
      );
    }

    const updated = await prisma.ambulance.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), isActive: false },
      select: SAFE_AMBULANCE_SELECT,
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: req?.user?.id,
      action: "DELETE_AMBULANCE",
      entity: "Ambulance",
      entityId: id,
      ipAddress,
      userAgent,
    });

    return updated;
  },
};