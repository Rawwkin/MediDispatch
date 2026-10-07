import { Response } from "express";

export type TMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type TResponseData<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: TMeta;
  errors?: unknown;
};

export const sendResponse = <T>(
  res: Response,
  payload: TResponseData<T>,
): void => {
  const body: Record<string, unknown> = {
    success: payload.success,
    statusCode: payload.statusCode,
    message: payload.message,
    data: payload.data,
  };

  if (payload.meta !== undefined) body.meta = payload.meta;
  if (payload.errors !== undefined) body.errors = payload.errors;

  res.status(payload.statusCode).json(body);
};