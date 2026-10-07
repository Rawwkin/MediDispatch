import { DispatchAssignmentStatus } from "../../../../generated/prisma/enums";

export type IAssignAmbulance = {
  ambulanceId: string;
  note?: string;
};

export type IReassignAmbulance = {
  newAmbulanceId: string;
  note?: string;
};

export type IUpdateDispatchStatus = {
  status: DispatchAssignmentStatus;
  note?: string;
};

export type IAvailableAmbulancesQuery = {
  emergencyId?: string;
  emergencyType?: string;
  priority?: string;
};