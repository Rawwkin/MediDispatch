export type ICreateHospital = {
  name: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
};

export type IUpdateHospital = Partial<ICreateHospital>;