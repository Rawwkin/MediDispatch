import { requireParam } from "../../utils/request";
import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { userService } from "../user/user.service";
import { adminService } from "./admin.service";

export const adminController = {
  // ---- Users ----
  listUsers: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.listUsers(req.query as Record<string, unknown>);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Users retrieved",
      data,
    });
  }),

  createUser: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.adminCreateUser(req.body, req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "User created",
      data,
    });
  }),

  getUserById: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.getUserById(requireParam(req.params.id));
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "User retrieved",
      data,
    });
  }),

  updateUser: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.adminUpdateUser(requireParam(req.params.id), req.body, req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "User updated",
      data,
    });
  }),

  deleteUser: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.softDeleteUser(requireParam(req.params.id), req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "User deleted",
      data,
    });
  }),

  restoreUser: catchAsync(async (req: Request, res: Response) => {
    const data = await userService.restoreUser(requireParam(req.params.id), req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "User restored",
      data,
    });
  }),

  // ---- Statistics ----
  getStatistics: catchAsync(async (req: Request, res: Response) => {
    const data = await adminService.getStatistics(req.query as Record<string, unknown>);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Statistics retrieved",
      data,
    });
  }),
};