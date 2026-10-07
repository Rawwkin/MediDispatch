import { ErrorRequestHandler } from "express";
import httpStatus from "http-status";
import { Prisma } from "../../../generated/prisma/client";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import config from "../config";

export const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message = err?.message ?? "Internal Server Error";
  let errors: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    if (err.details !== undefined) errors = err.details;
  } else if (err instanceof ZodError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Validation failed";
    errors = err.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = httpStatus.CONFLICT;
      message = `Duplicate value for ${(
        err.meta?.target as string[] | undefined
      )?.join(", ") ?? "field"}`;
    } else if (err.code === "P2003") {
      statusCode = httpStatus.BAD_REQUEST;
      message = "Foreign key constraint failed";
    } else if (err.code === "P2025") {
      statusCode = httpStatus.NOT_FOUND;
      message = "Record not found";
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Invalid database input";
  } else if (err?.name === "JsonWebTokenError") {
    statusCode = httpStatus.UNAUTHORIZED;
    message = "Invalid token";
  } else if (err?.name === "TokenExpiredError") {
    statusCode = httpStatus.UNAUTHORIZED;
    message = "Token expired";
  }

  const body: Record<string, unknown> = {
    success: false,
    statusCode,
    message,
  };
  if (errors !== undefined) body.errors = errors;
  if (!config.isProduction()) body.stack = (err as Error)?.stack;

  res.status(statusCode).json(body);
};