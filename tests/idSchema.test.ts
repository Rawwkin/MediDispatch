import { describe, expect, it } from "vitest";
import { objectIdSchema } from "../src/app/utils/idSchema";
import { assignAmbulanceSchema } from "../src/app/modules/dispatch/dispatch.validation";

describe("objectIdSchema", () => {
  it("accepts a real UUID", () => {
    expect(
      objectIdSchema.safeParse("f81d4fae-7dec-11d0-a765-00a0c91e6bf6").success,
    ).toBe(true);
  });

  it("accepts a CUID", () => {
    expect(objectIdSchema.safeParse("cklq2c0xa0000abcd12345678").success).toBe(true);
  });

  it("accepts a ULID", () => {
    expect(objectIdSchema.safeParse("01HXYZB123456789ABCDEFGHJK").success).toBe(true);
  });

  it("accepts a seed-style ID", () => {
    expect(objectIdSchema.safeParse("SEED-AMB-001").success).toBe(true);
    expect(objectIdSchema.safeParse("seed-hospital-+15555550100").success).toBe(true);
  });

  it("rejects empty strings", () => {
    expect(objectIdSchema.safeParse("").success).toBe(false);
    expect(objectIdSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects values over 64 chars", () => {
    expect(objectIdSchema.safeParse("a".repeat(65)).success).toBe(false);
  });

  it("rejects values with whitespace or odd characters", () => {
    expect(objectIdSchema.safeParse("has space").success).toBe(false);
    expect(objectIdSchema.safeParse("id/with/slash").success).toBe(false);
    expect(objectIdSchema.safeParse("id?with?qmark").success).toBe(false);
  });
});

describe("assignAmbulanceSchema (dispatch)", () => {
  it("accepts a UUID ambulanceId", () => {
    expect(
      assignAmbulanceSchema.safeParse({
        ambulanceId: "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
      }).success,
    ).toBe(true);
  });

  it("accepts a seed-style ambulanceId", () => {
    expect(
      assignAmbulanceSchema.safeParse({ ambulanceId: "SEED-AMB-001" }).success,
    ).toBe(true);
  });

  it("rejects an empty ambulanceId", () => {
    expect(
      assignAmbulanceSchema.safeParse({ ambulanceId: "" }).success,
    ).toBe(false);
  });

  it("rejects a missing ambulanceId", () => {
    expect(assignAmbulanceSchema.safeParse({}).success).toBe(false);
  });
});