import { z } from "zod";
import { UserRole, UserStatus } from "../../../../generated/prisma/enums";

const objectIdSchema = z.string().uuid("Invalid id");

const updateMyProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(6).max(32).optional(),
  profileImage: z.string().url().optional(),
});

const adminCreateUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  phone: z.string().trim().min(6).max(32).optional(),
  role: z.nativeEnum(UserRole),
});

const adminUpdateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(6).max(32).optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

const listUsersQuerySchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

const userIdParamSchema = z.object({ id: objectIdSchema });

export {
  updateMyProfileSchema,
  adminCreateUserSchema,
  adminUpdateUserSchema,
  listUsersQuerySchema,
  userIdParamSchema,
};