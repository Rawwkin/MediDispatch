import { requireParam } from "../../utils/request";
import { Request, Response } from "express";
import httpStatus from "http-status";
import { hospitalService } from "./hospital.service";
import { sendResponse } from "../../utils/sendResponse";
import { catchAsync } from "../../utils/catchAsync";

export const hospitalController = {
  create: catchAsync(async (req: Request, res: Response) => {
    const data = await hospitalService.create(req.body, req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Hospital created",
      data,
    });
  }),

  list: catchAsync(async (req: Request, res: Response) => {
    const data = await hospitalService.list(req.query as Record<string, unknown>);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Hospitals retrieved",
      data,
    });
  }),

  getById: catchAsync(async (req: Request, res: Response) => {
    const data = await hospitalService.getById(requireParam(req.params.id));
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Hospital retrieved",
      data,
    });
  }),

  update: catchAsync(async (req: Request, res: Response) => {
    const data = await hospitalService.update(requireParam(req.params.id), req.body, req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Hospital updated",
      data,
    });
  }),

  softDelete: catchAsync(async (req: Request, res: Response) => {
    const data = await hospitalService.softDelete(requireParam(req.params.id), req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Hospital deleted",
      data,
    });
  }),
};