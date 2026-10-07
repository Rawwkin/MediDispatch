import { AppError } from "./AppError";
import httpStatus from "http-status";

export const EMERGENCY_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["DISPATCHING", "CANCELLED"],
  DISPATCHING: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["EN_ROUTE", "CANCELLED"],
  EN_ROUTE: ["ARRIVED"],
  ARRIVED: ["PICKED_UP"],
  PICKED_UP: ["HOSPITAL_SELECTED"],
  HOSPITAL_SELECTED: ["HOSPITAL_ARRIVED"],
  HOSPITAL_ARRIVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const TRIP_TRANSITIONS: Record<string, string[]> = {
  NOT_STARTED: ["EN_ROUTE"],
  EN_ROUTE: ["AT_SCENE"],
  AT_SCENE: ["PATIENT_ONBOARD"],
  PATIENT_ONBOARD: ["AT_HOSPITAL"],
  AT_HOSPITAL: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const AMBULANCE_TRANSITIONS: Record<string, string[]> = {
  AVAILABLE: ["RESERVED", "MAINTENANCE", "OFFLINE"],
  RESERVED: ["EN_ROUTE", "AVAILABLE"],
  EN_ROUTE: ["AT_SCENE", "AVAILABLE"],
  AT_SCENE: ["PATIENT_ONBOARD", "AVAILABLE"],
  PATIENT_ONBOARD: ["AT_HOSPITAL"],
  AT_HOSPITAL: ["AVAILABLE"],
  MAINTENANCE: ["AVAILABLE"],
  OFFLINE: ["AVAILABLE"],
};

export const assertTransition = (
  table: Record<string, string[]>,
  from: string,
  to: string,
  entity: string,
): void => {
  const allowed = table[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Invalid ${entity} status transition: ${from} → ${to}`,
      { allowedTransitions: allowed },
    );
  }
};