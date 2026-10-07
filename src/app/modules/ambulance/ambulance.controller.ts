import { requireParam } from "../../utils/request";
import { Request, Response } from "express";
import httpStatus from "http-status";
import { ambulanceService } from "./ambulance.service";
import { sendResponse } from "../../utils/sendResponse";
import { catchAsync } from "../../utils/catchAsync";

export const ambulanceController = {
  create: catchAsync(async (req: Request, res: Response) => {
    const data = await ambulanceService.create(req.body, req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Ambulance created",
      data,
    });
  }),

  list: catchAsync(async (req: Request, res: Response) => {
    const data = await ambulanceService.list(req.query as Record<string, unknown>);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Ambulances retrieved",
      data,
    });
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    const data = await ambulanceService.getById(requireParam(req.params.id));
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Ambulance retrieved",
      data,
    });
  }),

  update: catchAsync(async (req: Request, res: Response) => {
    const data = await ambulanceService.update(requireParam(req.params.id), req.body, req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Ambulance updated",
      data,
    });
  }),

  softDelete: catchAsync(async (req: Request, res: Response) => {
    const data = await ambulanceService.softDelete(requireParam(req.params.id), req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Ambulance deleted",
      data,
    });
  }),
};