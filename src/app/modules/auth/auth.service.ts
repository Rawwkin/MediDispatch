import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../../lib/prisma";
import config from "../../config";
import { jwtUtils, type TJwtPayload } from "../../utils/jwt";
import { AppError } from "../../utils/AppError";
import { writeAudit, extractAuditContext } from "../../utils/audit";
import { UserRole } from "../../../../generated/prisma/enums";
import type { ILoginUser, IRegisterUser, IAuthResult } from "./auth.interface";
import type { Request } from "express";
import httpStatus from "http-status";

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const PUBLIC_USER_SELECT = {
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

const issueTokens = async (
  user: { id: string; name: string; email: string; role: UserRole },
  ipAddress?: string,
  userAgent?: string,
) => {
  const payload: TJwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.signAccessToken(payload);
  const refreshToken = jwtUtils.signRefreshToken(payload);

  // Persist refresh token (hashed) for revocation
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  if (ipAddress || userAgent) {
    await writeAudit(prisma, {
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      ipAddress,
      userAgent,
    });
  }

  return { accessToken, refreshToken };
};

export const authService = {
  async register(
    payload: IRegisterUser,
    req?: Request,
  ): Promise<IAuthResult> {
    const existing = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      throw new AppError(
        httpStatus.CONFLICT,
        "An account with this email already exists",
      );
    }

    const hashed = await bcrypt.hash(
      payload.password,
      config.bcryptSaltRounds,
    );

    // Public sign-up only ever creates CALLER. ADMIN / DISPATCHER are seeded
    // by an administrator — see prisma/seed.ts and admin/user creation flow.
    const role: UserRole = UserRole.CALLER;

    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email.toLowerCase(),
        password: hashed,
        phone: payload.phone,
        role,
        profile: {
          create: {},
        },
      },
      select: PUBLIC_USER_SELECT,
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    const { accessToken, refreshToken } = await issueTokens(
      user,
      ipAddress,
      userAgent,
    );

    return { accessToken, refreshToken, user };
  },

  async login(payload: ILoginUser, req?: Request): Promise<IAuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
        status: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Invalid email or password",
      );
    }
    if (user.status === "SUSPENDED") {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Your account is suspended. Contact support.",
      );
    }

    const ok = await bcrypt.compare(payload.password, user.password);
    if (!ok) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Invalid email or password",
      );
    }

    const { ipAddress, userAgent } = extractAuditContext(req);
    const tokens = await issueTokens(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
      },
      ipAddress,
      userAgent,
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
      },
    };
  },

  async refresh(refreshToken: string, req?: Request): Promise<IAuthResult> {
    if (!refreshToken) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Refresh token missing",
      );
    }

    let payload: TJwtPayload;
    try {
      payload = jwtUtils.verifyRefresh(refreshToken);
    } catch {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Invalid or expired refresh token",
      );
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });
    if (!stored || stored.revokedAt) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Refresh token has been revoked",
      );
    }
    if (stored.expiresAt.getTime() < Date.now()) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Refresh token has expired",
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: PUBLIC_USER_SELECT,
    });
    if (!user || user.isDeleted) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "User no longer exists",
      );
    }
    if (user.status === "SUSPENDED") {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "User account is suspended",
      );
    }

    // Rotate refresh token: revoke the old one, issue a new pair
    const newTokens = await issueTokens(user);
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedById: undefined },
    });
    // Link the new refresh token to the old one for traceability
    const newStored = await prisma.refreshToken.findFirst({
      where: { userId: user.id, tokenHash: hashToken(newTokens.refreshToken) },
    });
    if (newStored) {
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { replacedById: newStored.id },
      });
    }

    const { ipAddress, userAgent } = extractAuditContext(req);
    await writeAudit(prisma, {
      userId: user.id,
      action: "REFRESH_TOKEN",
      entity: "User",
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return { ...newTokens, user };
  },

  async logout(refreshToken: string, userId?: string, req?: Request) {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    if (userId) {
      const { ipAddress, userAgent } = extractAuditContext(req);
      await writeAudit(prisma, {
        userId,
        action: "LOGOUT",
        entity: "User",
        entityId: userId,
        ipAddress,
        userAgent,
      });
    }

    return { message: "Logged out successfully" };
  },
};