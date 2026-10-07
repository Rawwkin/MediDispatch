import type { Prisma, PrismaClient } from "../../../generated/prisma/client";
import type { Request } from "express";

export type AuditInput = {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
};

/**
 * Inserts an audit log. Accepts either a PrismaClient or an interactive transaction
 * client so it can be called from within `prisma.$transaction(async (tx) => ...)`.
 */
export const writeAudit = async (
  client: PrismaClient | Prisma.TransactionClient,
  entry: AuditInput,
): Promise<void> => {
  await client.auditLog.create({
    data: {
      userId: entry.userId ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      oldValue: entry.oldValue as Prisma.InputJsonValue | undefined,
      newValue: entry.newValue as Prisma.InputJsonValue | undefined,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    },
  });
};

export const extractAuditContext = (req?: Request) => {
  if (!req) return {};
  const ipAddress =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.ip ??
    req.socket?.remoteAddress;
  const userAgent = req.headers["user-agent"]?.toString().slice(0, 250);
  return { ipAddress, userAgent };
};