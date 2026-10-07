import { describe, expect, it } from "vitest";
import { buildMeta, parsePagination } from "../src/app/utils/pagination";

describe("parsePagination", () => {
  it("falls back to defaults when nothing is provided", () => {
    const p = parsePagination({});
    expect(p.page).toBe(1);
    expect(p.limit).toBe(10);
    expect(p.skip).toBe(0);
    expect(p.sortBy).toBe("createdAt");
    expect(p.sortOrder).toBe("desc");
  });

  it("parses page, limit, sortBy, sortOrder safely", () => {
    const p = parsePagination({ page: "3", limit: "25", sortBy: "name", sortOrder: "asc" });
    expect(p.page).toBe(3);
    expect(p.limit).toBe(25);
    expect(p.skip).toBe(50);
    expect(p.sortBy).toBe("name");
    expect(p.sortOrder).toBe("asc");
  });

  it("clamps limit to 100", () => {
    const p = parsePagination({ limit: "99999" });
    expect(p.limit).toBe(100);
  });

  it("only allows whitelisted sort fields", () => {
    const p = parsePagination({ sortBy: "password" });
    expect(p.sortBy).toBe("createdAt");
  });

  it("rejects negative inputs", () => {
    const p = parsePagination({ page: "-5", limit: "0" });
    expect(p.page).toBe(1);
    expect(p.limit).toBe(10);
  });
});

describe("buildMeta", () => {
  it("computes total pages correctly", () => {
    expect(buildMeta(0, 1, 10)).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
    expect(buildMeta(95, 1, 10)).toEqual({ page: 1, limit: 10, total: 95, totalPages: 10 });
    expect(buildMeta(100, 1, 10)).toEqual({ page: 1, limit: 10, total: 100, totalPages: 10 });
  });
});