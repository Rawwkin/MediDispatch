import {
  AmbulanceStatus,
  AmbulanceType,
} from "../../../../generated/prisma/enums";

export type ICreateAmbulance = {
  registrationNumber: string;
  type?: AmbulanceType;
  capacity?: number;
  status?: AmbulanceStatus;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
};

export type IUpdateAmbulance = Partial<ICreateAmbulance>;

export type IAmbulanceListQuery = {
  status?: AmbulanceStatus;
  type?: AmbulanceType;
  isActive?: boolean;
  search?: string;
};