import { UserRole, UserStatus } from "../../../../generated/prisma/enums";

export type IUpdateMyProfile = {
  name?: string;
  phone?: string;
  profileImage?: string;
};

export type IAdminUpdateUser = {
  name?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
};

export type IAdminCreateUser = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
};

export type IUserListQuery = {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
};