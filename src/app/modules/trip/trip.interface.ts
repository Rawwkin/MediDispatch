import { TripStatus } from "../../../../generated/prisma/enums";

export type IUpdateTripStatus = {
  status: TripStatus;
  distance?: number;
  finalFare?: number;
};

export type ISelectHospital = {
  hospitalId: string;
};

export type ITripListQuery = {
  status?: TripStatus;
  emergencyId?: string;
};