import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildMeta, parsePagination } from "../../utils/pagination";
import { writeAudit, extractAuditContext } from "../../utils/audit";
import type { ICreateDriver, IUpdateDriver } from "./driver.interface";
import type { Request } from "express";

const SAFE_DRIVER_SELECT = {
  id: true,
  name: true,
  phone: true,
  licenseNumber: true,
  licenseExpiry: true,
  ambulanceId: true,
  isActive: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const driverService = {
  async create(payload: ICreateDriver, req?: Request) {
    const exists = await prisma.driver.findUnique({
      where: { licenseNumber: payload.licenseNumber },
    });
    if (exists) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A driver with this license number already exists",
      );
    }

    if (payload.ambulanceId) {
      const ambulance = await prisma.ambulance.findUnique({
        where: { id: payload.ambulanceId },
      });
      if (!ambulance || ambulance.isDeleted) {
        throw new AppError(httpStatus.BAD_REQUEST, "Ambulance not found");
      }
    }

    const driver = await prisma.driver.create({
      data: {
        name: payload.name,
        phone: payload.phone,
        licenseNumber: payload.licenseNumber,
        licenseExpiry: new Date(payload.licenseExpiry),
        ambulanceId: payload.ambulanceId,
      },
      select: { ...SAFE_DRIVER_SELECT, ambulance: true },
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: req?.user?.id,
      action: "CREATE_DRIVER",
      entity: "Driver",
      entityId: driver.id,
      newValue: { name: driver.name, ambulanceId: driver.ambulanceId },
      ipAddress,
      userAgent,
    });

    return driver;
  },

  async list(query: Record<string, unknown>) {
    const { page, limit, skip, sortBy, sortOrder } = parsePagination(query);
    const where: Record<string, unknown> = { deletedAt: null };
    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search), mode: "insensitive" } },
        { phone: { contains: String(query.search) } },
        { licenseNumber: { contains: String(query.search), mode: "insensitive" } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.driver.findMany({
        where,
        select: { ...SAFE_DRIVER_SELECT, ambulance: true },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.driver.count({ where }),
    ]);

    return { items, meta: buildMeta(total, page, limit) };
  },

  async getById(id: string) {
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { ...SAFE_DRIVER_SELECT, ambulance: true },
    });
    if (!driver || driver.deletedAt) {
      throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
    }
    return driver;
  },

  async update(id: string, payload: IUpdateDriver, req?: Request) {
    const before = await prisma.driver.findUnique({ where: { id } });
    if (!before || before.deletedAt) {
      throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
    }

    if (
      payload.licenseNumber &&
      payload.licenseNumber !== before.licenseNumber
    ) {
      const dup = await prisma.driver.findUnique({
        where: { licenseNumber: payload.licenseNumber },
      });
      if (dup) {
        throw new AppError(
          httpStatus.CONFLICT,
          "Another driver already uses this license number",
        );
      }
    }

    const data = { ...payload } as Record<string, unknown>;
    if (data.licenseExpiry && typeof data.licenseExpiry === "string") {
      data.licenseExpiry = new Date(data.licenseExpiry);
    }

    const updated = await prisma.driver.update({
      where: { id },
      data,
      select: { ...SAFE_DRIVER_SELECT, ambulance: true },
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: req?.user?.id,
      action: "UPDATE_DRIVER",
      entity: "Driver",
      entityId: id,
      oldValue: { isActive: before.isActive, ambulanceId: before.ambulanceId },
      newValue: { isActive: updated.isActive, ambulanceId: updated.ambulanceId },
      ipAddress,
      userAgent,
    });

    return updated;
  },

  async softDelete(id: string, req?: Request) {
    const before = await prisma.driver.findUnique({ where: { id } });
    if (!before || before.deletedAt) {
      throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
    }

    await prisma.driver.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, ambulanceId: null },
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: req?.user?.id,
      action: "DELETE_DRIVER",
      entity: "Driver",
      entityId: id,
      ipAddress,
      userAgent,
    });

    return { id, deletedAt: new Date() };
  },
};