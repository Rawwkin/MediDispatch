import { UserRole } from "../../../../generated/prisma/enums";

export type IRegisterUser = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
};

export type ILoginUser = {
  email: string;
  password: string;
};

export type IAuthResult = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
};