import {
  EmergencyPriority,
  EmergencyStatus,
  EmergencyType,
} from "../../../../generated/prisma/enums";

export type ICreateEmergency = {
  emergencyType: EmergencyType;
  description?: string;
  priority?: EmergencyPriority;
  latitude: number;
  longitude: number;
  locationAddress?: string;
  contactPhone?: string;
  contactName?: string;
};

export type IUpdateEmergency = Partial<ICreateEmergency>;

export type IEmergencyListQuery = {
  status?: EmergencyStatus;
  priority?: EmergencyPriority;
  type?: EmergencyType;
  search?: string;
};

export type ICancelEmergency = {
  reason?: string;
};

export type ISelectHospital = {
  hospitalId: string;
};

export type IAutoPriorityInput = {
  emergencyType: EmergencyType;
  description?: string;
};