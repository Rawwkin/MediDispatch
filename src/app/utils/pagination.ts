export type PaginationInput = {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
};

const SORTABLE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "priority",
  "status",
  "name",
  "registrationNumber",
  "amount",
  "paidAt",
]);

export const parsePagination = (query: Record<string, unknown>): PaginationInput => {
  const rawPage = Number(query.page ?? 1);
  const rawLimit = Number(query.limit ?? 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), 100)
      : 10;

  const requestedSortBy = String(query.sortBy ?? "createdAt");
  const sortBy = SORTABLE_FIELDS.has(requestedSortBy) ? requestedSortBy : "createdAt";

  const sortOrder: "asc" | "desc" =
    String(query.sortOrder ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    sortBy,
    sortOrder,
  };
};

export const buildMeta = (
  total: number,
  page: number,
  limit: number,
): { page: number; limit: number; total: number; totalPages: number } => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});