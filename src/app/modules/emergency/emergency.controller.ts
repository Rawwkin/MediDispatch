import { requireParam } from "../../utils/request";
import { Request, Response } from "express";
import httpStatus from "http-status";
import { emergencyService } from "./emergency.service";
import { sendResponse } from "../../utils/sendResponse";
import { catchAsync } from "../../utils/catchAsync";

export const emergencyController = {
  create: catchAsync(async (req: Request, res: Response) => {
    const data = await emergencyService.create(req.user!.id, req.body, req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Emergency request created",
      data,
    });
  }),

  list: catchAsync(async (req: Request, res: Response) => {
    const data = await emergencyService.list(
      req.user!.role,
      req.user!.id,
      req.query as Record<string, unknown>,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Emergencies retrieved",
      data,
    });
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    const data = await emergencyService.getById(
      req.user!.role,
      req.user!.id,
      requireParam(req.params.id),
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Emergency retrieved",
      data,
    });
  }),

  update: catchAsync(async (req: Request, res: Response) => {
    const data = await emergencyService.update(
      req.user!.role,
      req.user!.id,
      requireParam(req.params.id),
      req.body,
      req,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Emergency updated",
      data,
    });
  }),

  cancel: catchAsync(async (req: Request, res: Response) => {
    const data = await emergencyService.cancel(
      req.user!.role,
      req.user!.id,
      requireParam(req.params.id),
      req.body?.reason,
      req,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Emergency cancelled",
      data,
    });
  }),

  softDelete: catchAsync(async (req: Request, res: Response) => {
    const data = await emergencyService.softDelete(req.user!.id, requireParam(req.params.id), req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Emergency deleted",
      data,
    });
  }),
};