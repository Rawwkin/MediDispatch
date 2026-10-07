import { NextFunction, Request, Response } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils, type TJwtPayload } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import httpStatus from "http-status";
import { prisma } from "../lib/prisma";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: TJwtPayload;
    }
  }
}

export const auth = (...requiredRoles: UserRole[]) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Unauthorized: Missing or malformed Authorization header",
      );
    }

    const token = header.split(" ")[1];
    if (!token) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Unauthorized: No bearer token provided",
      );
    }

    let decoded: TJwtPayload;
    try {
      decoded = jwtUtils.verifyAccess(token);
    } catch {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Unauthorized: Invalid or expired access token",
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isDeleted: true,
      },
    });

    if (!user || user.isDeleted) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: User not found");
    }

    if (user.status === "SUSPENDED") {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Forbidden: User account is suspended",
      );
    }

    if (
      requiredRoles.length > 0 &&
      !requiredRoles.includes(user.role as UserRole)
    ) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Forbidden: You do not have permission to perform this action",
      );
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    next();
  });

// Convenience alias mirroring the assignment's wording.
export const authorize = (...roles: UserRole[]) => auth(...roles);