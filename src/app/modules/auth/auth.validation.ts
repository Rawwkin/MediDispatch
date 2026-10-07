import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string({ required_error: "name is required" })
    .trim()
    .min(2, "name must be at least 2 characters")
    .max(120, "name must be at most 120 characters"),
  email: z
    .string({ required_error: "email is required" })
    .trim()
    .toLowerCase()
    .email("Invalid email address"),
  password: z
    .string({ required_error: "password is required" })
    .min(8, "password must be at least 8 characters")
    .max(128, "password must be at most 128 characters"),
  phone: z
    .string()
    .trim()
    .min(6, "phone is too short")
    .max(32, "phone is too long")
    .optional(),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "email is required" })
    .trim()
    .toLowerCase()
    .email("Invalid email address"),
  password: z
    .string({ required_error: "password is required" })
    .min(1, "password is required"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;