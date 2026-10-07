import { Request, Response } from "express";
import httpStatus from "http-status";
import { auditService } from "./audit.service";
import { sendResponse } from "../../utils/sendResponse";
import { catchAsync } from "../../utils/catchAsync";

export const auditController = {
  list: catchAsync(async (req: Request, res: Response) => {
    const data = await auditService.list(req.query as Record<string, unknown>);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Audit logs retrieved",
      data,
    });
  }),
};