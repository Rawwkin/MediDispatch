import { prisma } from "../../lib/prisma";
import { buildMeta, parsePagination } from "../../utils/pagination";

export const auditService = {
  async list(query: Record<string, unknown>) {
    const { page, limit, skip, sortBy, sortOrder } = parsePagination(query);
    const where: Record<string, unknown> = {};
    if (query.userId) where.userId = String(query.userId);
    if (query.action) where.action = String(query.action);
    if (query.entity) where.entity = String(query.entity);
    if (query.entityId) where.entityId = String(query.entityId);

    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, meta: buildMeta(total, page, limit) };
  },
};