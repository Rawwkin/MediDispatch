import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { buildMeta, parsePagination } from "../../utils/pagination";
import { writeAudit, extractAuditContext } from "../../utils/audit";
import config from "../../config";
import type {
  IAdminCreateUser,
  IAdminUpdateUser,
  IUpdateMyProfile,
  IUserListQuery,
} from "./user.interface";
import { UserRole } from "../../../../generated/prisma/enums";
import type { Request } from "express";

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  profileImage: true,
  status: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
} as const;

const findActiveUser = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }
  return user;
};

export const userService = {
  async getMyProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ...SAFE_USER_SELECT, profile: true },
    });
    if (!user || user.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }
    return user;
  },

  async updateMyProfile(
    userId: string,
    payload: IUpdateMyProfile,
    req?: Request,
  ) {
    const before = await findActiveUser(userId);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: payload.name,
        phone: payload.phone,
        profileImage: payload.profileImage,
      },
      select: { ...SAFE_USER_SELECT, profile: true },
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId,
      action: "UPDATE_PROFILE",
      entity: "User",
      entityId: userId,
      oldValue: { name: before.name, phone: before.phone },
      newValue: { name: updated.name, phone: updated.phone },
      ipAddress,
      userAgent,
    });

    return updated;
  },

  // -------- Admin operations --------

  async listUsers(query: Record<string, unknown> & IUserListQuery) {
    const { page, limit, skip, sortBy, sortOrder } = parsePagination(query);

    const where: Record<string, unknown> = { isDeleted: false };
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: SAFE_USER_SELECT,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, meta: buildMeta(total, page, limit) };
  },

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { ...SAFE_USER_SELECT, profile: true },
    });
    if (!user || user.isDeleted) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }
    return user;
  },

  async adminCreateUser(payload: IAdminCreateUser, req?: Request) {
    const exists = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    });
    if (exists) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A user with this email already exists",
      );
    }

    const hashed = await bcrypt.hash(
      payload.password,
      config.bcryptSaltRounds,
    );

    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email.toLowerCase(),
        password: hashed,
        phone: payload.phone,
        role: payload.role,
        profile: { create: {} },
      },
      select: SAFE_USER_SELECT,
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: req?.user?.id,
      action: "CREATE_USER",
      entity: "User",
      entityId: user.id,
      newValue: { role: user.role, email: user.email },
      ipAddress,
      userAgent,
    });

    return user;
  },

  async adminUpdateUser(
    id: string,
    payload: IAdminUpdateUser,
    req?: Request,
  ) {
    const before = await findActiveUser(id);

    if (
      before.role === UserRole.ADMIN &&
      payload.status === "SUSPENDED"
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "An admin account cannot be suspended",
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: payload,
      select: SAFE_USER_SELECT,
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: req?.user?.id,
      action: "UPDATE_USER",
      entity: "User",
      entityId: id,
      oldValue: { role: before.role, status: before.status },
      newValue: { role: updated.role, status: updated.status },
      ipAddress,
      userAgent,
    });

    return updated;
  },

  async softDeleteUser(id: string, req?: Request) {
    const user = await findActiveUser(id);

    if (user.role === UserRole.ADMIN) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Admin accounts cannot be deleted",
      );
    }

    await prisma.user.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    // Revoke refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: req?.user?.id,
      action: "DELETE_USER",
      entity: "User",
      entityId: id,
      oldValue: { email: user.email, role: user.role },
      ipAddress,
      userAgent,
    });

    return { id, deletedAt: new Date() };
  },

  async restoreUser(id: string, req?: Request) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }
    if (!user.isDeleted) {
      return user;
    }

    const restored = await prisma.user.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
      select: SAFE_USER_SELECT,
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: req?.user?.id,
      action: "RESTORE_USER",
      entity: "User",
      entityId: id,
      ipAddress,
      userAgent,
    });

    return restored;
  },
};