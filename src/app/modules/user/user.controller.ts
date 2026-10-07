import { Request, Response } from "express";
import httpStatus from "http-status";
import { userService } from "./user.service";
import { sendResponse } from "../../utils/sendResponse";
import { catchAsync } from "../../utils/catchAsync";

export const userController = {
  getMyProfile: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.getMyProfile(req.user!.id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Profile retrieved",
      data,
    });
  }),

  updateMyProfile: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.updateMyProfile(req.user!.id, req.body, req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Profile updated",
      data,
    });
  }),
};