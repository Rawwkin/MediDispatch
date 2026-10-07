import { requireParam } from "../../utils/request";
import { Request, Response } from "express";
import httpStatus from "http-status";
import { dispatchService } from "./dispatch.service";
import { sendResponse } from "../../utils/sendResponse";
import { catchAsync } from "../../utils/catchAsync";

export const dispatchController = {
  availableAmbulances: catchAsync(async (req: Request, res: Response) => {
    const data = await dispatchService.availableAmbulances(
      req.query as Record<string, string>,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Available ambulances retrieved",
      data,
    });
  }),

  assignAmbulance: catchAsync(async (req: Request, res: Response) => {
    const data = await dispatchService.assignAmbulance(
      req.user!.id,
      requireParam(req.params.emergencyId),
      req.body,
      req,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Ambulance assigned",
      data,
    });
  }),

  reassignAmbulance: catchAsync(async (req: Request, res: Response) => {
    const data = await dispatchService.reassignAmbulance(
      req.user!.id,
      requireParam(req.params.assignmentId),
      req.body,
      req,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Ambulance reassigned",
      data,
    });
  }),

  updateAssignmentStatus: catchAsync(async (req: Request, res: Response) => {
    const data = await dispatchService.updateAssignmentStatus(
      req.user!.id,
      requireParam(req.params.assignmentId),
      req.body,
      req,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Assignment status updated",
      data,
    });
  }),

  listAssignments: catchAsync(async (req: Request, res: Response) => {
    const data = await dispatchService.listAssignments(
      req.query as Record<string, unknown>,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Assignments retrieved",
      data,
    });
  }),
};