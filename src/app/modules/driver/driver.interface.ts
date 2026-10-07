export type ICreateDriver = {
  name: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string | Date;
  ambulanceId?: string;
};

export type IUpdateDriver = Partial<ICreateDriver> & { isActive?: boolean };