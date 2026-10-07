import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

export const adminService = {
  async getStatistics(query: Record<string, unknown>) {
    const since =
      typeof query.since === "string" ? new Date(query.since) : undefined;
    const until =
      typeof query.until === "string" ? new Date(query.until) : undefined;

    if (since && Number.isNaN(since.getTime())) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid 'since' date");
    }
    if (until && Number.isNaN(until.getTime())) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid 'until' date");
    }

    const dateFilter =
      since || until
        ? { createdAt: { ...(since ? { gte: since } : {}), ...(until ? { lte: until } : {}) } }
        : {};

    const [
      totalUsers,
      totalEmergencies,
      pendingEmergencies,
      completedEmergencies,
      cancelledEmergencies,
      availableAmbulances,
      busyAmbulances,
      totalTrips,
      totalPayments,
      paidPayments,
      totalHospitals,
      totalAmbulances,
      totalDrivers,
    ] = await Promise.all([
      prisma.user.count({ where: { isDeleted: false } }),
      prisma.emergencyRequest.count({ where: { isDeleted: false, ...dateFilter } }),
      prisma.emergencyRequest.count({
        where: { status: "PENDING", isDeleted: false, ...dateFilter },
      }),
      prisma.emergencyRequest.count({
        where: { status: "COMPLETED", isDeleted: false, ...dateFilter },
      }),
      prisma.emergencyRequest.count({
        where: { status: "CANCELLED", isDeleted: false, ...dateFilter },
      }),
      prisma.ambulance.count({
        where: { isDeleted: false, isActive: true, status: "AVAILABLE" },
      }),
      prisma.ambulance.count({
        where: {
          isDeleted: false,
          isActive: true,
          status: { in: ["RESERVED", "EN_ROUTE", "AT_SCENE", "PATIENT_ONBOARD", "AT_HOSPITAL"] },
        },
      }),
      prisma.trip.count(),
      prisma.payment.count(),
      prisma.payment.count({ where: { status: "PAID" } }),
      prisma.hospital.count({ where: { isDeleted: false, isActive: true } }),
      prisma.ambulance.count({ where: { isDeleted: false } }),
      prisma.driver.count({ where: { deletedAt: null } }),
    ]);

    return {
      users: { total: totalUsers },
      emergencies: {
        total: totalEmergencies,
        pending: pendingEmergencies,
        completed: completedEmergencies,
        cancelled: cancelledEmergencies,
      },
      ambulances: {
        total: totalAmbulances,
        available: availableAmbulances,
        busy: busyAmbulances,
      },
      trips: { total: totalTrips },
      payments: {
        total: totalPayments,
        successful: paidPayments,
      },
      hospitals: { total: totalHospitals },
      drivers: { total: totalDrivers },
      generatedAt: new Date(),
    };
  },
};