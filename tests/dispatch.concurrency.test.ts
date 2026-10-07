/**
 * Verifies the concurrency-safety pattern used in
 * `dispatchService.assignAmbulance` without needing a real database.
 *
 * The mock simulates an atomic check-and-set on `ambulance.updateMany`:
 * the first concurrent caller sees `count === 1`, every subsequent one
 * sees `count === 0` and is rejected with an `AppError`.
 */
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../src/app/utils/AppError";

let raceCount = 1;

const tx = {
  emergencyRequest: {
    findUnique: vi.fn(async () => ({
      id: "emergency-1",
      status: "PENDING",
      priority: "HIGH",
      isDeleted: false,
    })),
    update: vi.fn(async () => ({ id: "emergency-1", status: "ASSIGNED" })),
  },
  ambulance: {
    updateMany: vi.fn(async () => {
      if (raceCount > 0) {
        raceCount -= 1;
        return { count: 1 };
      }
      return { count: 0 };
    }),
    update: vi.fn(async () => ({ id: "ambulance-1", status: "AVAILABLE" })),
  },
  dispatchAssignment: {
    updateMany: vi.fn(async () => ({ count: 0 })),
    create: vi.fn(async ({ data }) => ({
      id: "assignment-1",
      status: "PENDING",
      ...data,
    })),
  },
  emergencyStatusHistory: {
    create: vi.fn(async () => ({})),
  },
  trip: {
    findUnique: vi.fn(async () => null),
    create: vi.fn(async ({ data }) => ({ id: "trip-1", ...data })),
    update: vi.fn(async () => ({})),
  },
  auditLog: {
    create: vi.fn(async () => ({})),
  },
};

vi.mock("../src/app/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (fn) => fn(tx)),
  },
}));

import { dispatchService } from "../src/app/modules/dispatch/dispatch.service";

describe("dispatchService.assignAmbulance — concurrency", () => {
  it("allows only one of two concurrent callers to succeed", async () => {
    raceCount = 1;
    const ok = await dispatchService.assignAmbulance(
      "dispatcher-1",
      "emergency-1",
      { ambulanceId: "ambulance-1" },
    );
    expect(ok.id).toBe("assignment-1");

    await expect(
      dispatchService.assignAmbulance("dispatcher-2", "emergency-1", {
        ambulanceId: "ambulance-1",
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});