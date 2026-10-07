import { requireParam } from "../../utils/request";
import { Request, Response } from "express";
import httpStatus from "http-status";
import { driverService } from "./driver.service";
import { sendResponse } from "../../utils/sendResponse";
import { catchAsync } from "../../utils/catchAsync";

export const driverController = {
  create: catchAsync(async (req: Request, res: Response) => {
    const data = await driverService.create(req.body, req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Driver created",
      data,
    });
  }),

  list: catchAsync(async (req: Request, res: Response) => {
    const data = await driverService.list(req.query as Record<string, unknown>);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Drivers retrieved",
      data,
    });
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    const data = await driverService.getById(requireParam(req.params.id));
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Driver retrieved",
      data,
    });
  }),

  update: catchAsync(async (req: Request, res: Response) => {
    const data = await driverService.update(requireParam(req.params.id), req.body, req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Driver updated",
      data,
    });
  }),

  softDelete: catchAsync(async (req: Request, res: Response) => {
    const data = await driverService.softDelete(requireParam(req.params.id), req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Driver deleted",
      data,
    });
  }),
};