import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildMeta, parsePagination } from "../../utils/pagination";
import { writeAudit, extractAuditContext } from "../../utils/audit";
import type { ICreateHospital, IUpdateHospital } from "./hospital.interface";
import type { Request } from "express";

const SAFE_HOSPITAL_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  city: true,
  latitude: true,
  longitude: true,
  isActive: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const hospitalService = {
  async create(payload: ICreateHospital, req?: Request) {
    const hospital = await prisma.hospital.create({
      data: {
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        address: payload.address,
        city: payload.city,
        latitude: payload.latitude,
        longitude: payload.longitude,
        isActive: payload.isActive ?? true,
      },
      select: SAFE_HOSPITAL_SELECT,
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: req?.user?.id,
      action: "CREATE_HOSPITAL",
      entity: "Hospital",
      entityId: hospital.id,
      newValue: { name: hospital.name, city: hospital.city },
      ipAddress,
      userAgent,
    });

    return hospital;
  },

  async list(query: Record<string, unknown>) {
    const { page, limit, skip, sortBy, sortOrder } = parsePagination(query);
    const where: Record<string, unknown> = { isDeleted: false };
    if (query.city) where.city = String(query.city);
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search), mode: "insensitive" } },
        { address: { contains: String(query.search), mode: "insensitive" } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.hospital.findMany({
        where,
        select: SAFE_HOSPITAL_SELECT,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.hospital.count({ where }),
    ]);

    return { items, meta: buildMeta(total, page, limit) };
  },

  async getById(id: string) {
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      select: SAFE_HOSPITAL_SELECT,
    });
    if (!hospital || hospital.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "Hospital not found");
    }
    return hospital;
  },

  async update(id: string, payload: IUpdateHospital, req?: Request) {
    const before = await prisma.hospital.findUnique({ where: { id } });
    if (!before || before.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "Hospital not found");
    }

    const updated = await prisma.hospital.update({
      where: { id },
      data: payload,
      select: SAFE_HOSPITAL_SELECT,
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: req?.user?.id,
      action: "UPDATE_HOSPITAL",
      entity: "Hospital",
      entityId: id,
      oldValue: before,
      newValue: updated,
      ipAddress,
      userAgent,
    });

    return updated;
  },

  async softDelete(id: string, req?: Request) {
    const before = await prisma.hospital.findUnique({ where: { id } });
    if (!before || before.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "Hospital not found");
    }

    const updated = await prisma.hospital.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), isActive: false },
      select: SAFE_HOSPITAL_SELECT,
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: req?.user?.id,
      action: "DELETE_HOSPITAL",
      entity: "Hospital",
      entityId: id,
      ipAddress,
      userAgent,
    });

    return updated;
  },
};