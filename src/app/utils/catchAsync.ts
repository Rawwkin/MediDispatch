import { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wrap an async route handler so that thrown errors reach `globalErrorHandler`
 * instead of crashing the process or hanging the response.
 */
export const catchAsync =
  (fn: RequestHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };