import { NextFunction, Request, Response } from "express";
import { ZodError, ZodTypeAny } from "zod";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import httpStatus from "http-status";

export type ValidationSchemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

/**
 * Zod-based request validator. Mutates req.body/query/params with the
 * parsed (and possibly default-filled) values so downstream code sees the
 * canonical shape.
 */
export const validate = (schemas: ValidationSchemas) =>
  catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        const parsed = await schemas.query.parseAsync(req.query);
        // Express 5 makes req.query a getter — assign through a fresh object.
        Object.assign(req.query, parsed);
      }
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(req.params)) as typeof req.params;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
          code: i.code,
        }));
        next(
          new AppError(
            httpStatus.BAD_REQUEST,
            "Validation failed: " + issues.map((i) => i.message).join("; "),
            issues,
          ),
        );
        return;
      }
      next(error);
    }
  });