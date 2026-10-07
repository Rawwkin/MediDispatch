import { describe, expect, it } from "vitest";
import {
  AMBULANCE_TRANSITIONS,
  EMERGENCY_TRANSITIONS,
  TRIP_TRANSITIONS,
  assertTransition,
} from "../src/app/utils/stateMachine";
import { AppError } from "../src/app/utils/AppError";

describe("stateMachine", () => {
  it("allows valid emergency transitions", () => {
    expect(() =>
      assertTransition(EMERGENCY_TRANSITIONS, "PENDING", "DISPATCHING", "EmergencyRequest"),
    ).not.toThrow();
    expect(() =>
      assertTransition(EMERGENCY_TRANSITIONS, "EN_ROUTE", "ARRIVED", "EmergencyRequest"),
    ).not.toThrow();
    expect(() =>
      assertTransition(EMERGENCY_TRANSITIONS, "COMPLETED", "CANCELLED", "EmergencyRequest"),
    ).toThrow(AppError);
  });

  it("rejects invalid emergency transitions", () => {
    expect(() =>
      assertTransition(EMERGENCY_TRANSITIONS, "PENDING", "ARRIVED", "EmergencyRequest"),
    ).toThrow(/Invalid EmergencyRequest status transition/);
  });

  it("only allows PENDING/DISPATCHING to CANCELLED", () => {
    expect(() =>
      assertTransition(EMERGENCY_TRANSITIONS, "PENDING", "CANCELLED", "EmergencyRequest"),
    ).not.toThrow();
    expect(() =>
      assertTransition(EMERGENCY_TRANSITIONS, "DISPATCHING", "CANCELLED", "EmergencyRequest"),
    ).not.toThrow();
    expect(() =>
      assertTransition(EMERGENCY_TRANSITIONS, "EN_ROUTE", "CANCELLED", "EmergencyRequest"),
    ).toThrow(AppError);
  });

  it("validates trip transitions", () => {
    expect(() =>
      assertTransition(TRIP_TRANSITIONS, "NOT_STARTED", "EN_ROUTE", "Trip"),
    ).not.toThrow();
    expect(() =>
      assertTransition(TRIP_TRANSITIONS, "AT_HOSPITAL", "COMPLETED", "Trip"),
    ).not.toThrow();
    expect(() =>
      assertTransition(TRIP_TRANSITIONS, "COMPLETED", "EN_ROUTE", "Trip"),
    ).toThrow(AppError);
  });

  it("validates ambulance transitions", () => {
    expect(() =>
      assertTransition(AMBULANCE_TRANSITIONS, "AVAILABLE", "RESERVED", "Ambulance"),
    ).not.toThrow();
    expect(() =>
      assertTransition(AMBULANCE_TRANSITIONS, "RESERVED", "EN_ROUTE", "Ambulance"),
    ).not.toThrow();
    expect(() =>
      assertTransition(AMBULANCE_TRANSITIONS, "OFFLINE", "EN_ROUTE", "Ambulance"),
    ).toThrow(AppError);
  });
});