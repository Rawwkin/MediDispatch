import { requireParam } from "../../utils/request";
import { Request, Response } from "express";
import httpStatus from "http-status";
import { tripService } from "./trip.service";
import { sendResponse } from "../../utils/sendResponse";
import { catchAsync } from "../../utils/catchAsync";

export const tripController = {
  list: catchAsync(async (req: Request, res: Response) => {
    const data = await tripService.list(
      req.user!.role,
      req.user!.id,
      req.query as Record<string, unknown>,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Trips retrieved",
      data,
    });
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    const data = await tripService.getById(
      req.user!.role,
      req.user!.id,
      requireParam(req.params.id),
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Trip retrieved",
      data,
    });
  }),

  selectHospital: catchAsync(async (req: Request, res: Response) => {
    const data = await tripService.selectHospital(
      req.user!.id,
      requireParam(req.params.id),
      req.body,
      req,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Hospital selected",
      data,
    });
  }),

  updateStatus: catchAsync(async (req: Request, res: Response) => {
    const data = await tripService.updateStatus(
      req.user!.id,
      requireParam(req.params.id),
      req.body,
      req,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Trip status updated",
      data,
    });
  }),
};