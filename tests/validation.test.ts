import { describe, expect, it } from "vitest";
import { registerSchema, loginSchema } from "../src/app/modules/auth/auth.validation";
import { createEmergencySchema } from "../src/app/modules/emergency/emergency.validation";
import { createHospitalSchema } from "../src/app/modules/hospital/hospital.validation";
import { suggestPriority } from "../src/app/modules/emergency/priority.service";

describe("auth validation", () => {
  it("rejects a short password", () => {
    const result = registerSchema.safeParse({
      name: "Jane",
      email: "jane@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("lowercases email and trims name", () => {
    const result = registerSchema.safeParse({
      name: "  Jane Doe  ",
      email: "  JANE@example.com ",
      password: "supersecret",
    });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("jane@example.com");
    expect(result.data?.name).toBe("Jane Doe");
  });

  it("requires email on login", () => {
    expect(loginSchema.safeParse({ email: "", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "x@y.com", password: "" }).success).toBe(false);
  });
});

describe("emergency validation", () => {
  it("rejects out-of-range coordinates", () => {
    const result = createEmergencySchema.safeParse({
      emergencyType: "CARDIAC",
      latitude: 95,
      longitude: 0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed emergency", () => {
    const result = createEmergencySchema.safeParse({
      emergencyType: "TRAUMA",
      latitude: 40.7128,
      longitude: -74.006,
      priority: "HIGH",
    });
    expect(result.success).toBe(true);
  });
});

describe("hospital validation", () => {
  it("requires name, phone, address", () => {
    const r = createHospitalSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

describe("suggestPriority", () => {
  it("treats CARDIAC as CRITICAL by default", () => {
    expect(suggestPriority("CARDIAC" as never)).toBe("CRITICAL");
  });

  it("upgrades to CRITICAL when description mentions cardiac arrest", () => {
    expect(suggestPriority("GENERAL_MEDICAL" as never, "patient in cardiac arrest"))
      .toBe("CRITICAL");
  });

  it("uses MEDIUM for an unrelated general medical call", () => {
    expect(suggestPriority("GENERAL_MEDICAL" as never)).toBe("MEDIUM");
  });
});