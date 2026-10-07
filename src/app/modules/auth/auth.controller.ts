import { Request, Response } from "express";
import httpStatus from "http-status";
import { authService } from "./auth.service";
import { sendResponse } from "../../utils/sendResponse";
import { catchAsync } from "../../utils/catchAsync";

export const authController = {
  register: catchAsync(async (req: Request, res: Response) => {
    const result = await authService.register(req.body, req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "User registered successfully",
      data: result,
    });
  }),

  login: catchAsync(async (req: Request, res: Response) => {
    const result = await authService.login(req.body, req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Logged in successfully",
      data: result,
    });
  }),

  refreshToken: catchAsync(async (req: Request, res: Response) => {
    // Accept refresh token from body or cookie
    const tokenFromBody = req.body?.refreshToken as string | undefined;
    const tokenFromCookie = req.cookies?.refreshToken as string | undefined;
    const refreshToken = (tokenFromBody ?? tokenFromCookie) ?? "";

    const result = await authService.refresh(refreshToken, req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Token refreshed",
      data: result,
    });
  }),

  logout: catchAsync(async (req: Request, res: Response) => {
    const tokenFromBody = req.body?.refreshToken as string | undefined;
    const tokenFromCookie = req.cookies?.refreshToken as string | undefined;
    const refreshToken = (tokenFromBody ?? tokenFromCookie) ?? "";

    const result = await authService.logout(refreshToken, req.user?.id, req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Logged out successfully",
      data: result,
    });
  }),
};