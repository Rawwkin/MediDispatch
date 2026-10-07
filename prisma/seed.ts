import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/app/lib/prisma";
import { UserRole } from "../generated/prisma/enums";

const DEMO_PASSWORD = "Demo@12345";

const seedUsers = async () => {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ambulance.local" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@ambulance.local",
      password,
      role: UserRole.ADMIN,
      phone: "+10000000000",
      profile: { create: {} },
    },
  });

  const dispatcher = await prisma.user.upsert({
    where: { email: "dispatch@ambulance.local" },
    update: {},
    create: {
      name: "Demo Dispatcher",
      email: "dispatch@ambulance.local",
      password,
      role: UserRole.DISPATCHER,
      phone: "+10000000001",
      profile: { create: {} },
    },
  });

  const caller = await prisma.user.upsert({
    where: { email: "caller@ambulance.local" },
    update: {},
    create: {
      name: "Demo Caller",
      email: "caller@ambulance.local",
      password,
      role: UserRole.CALLER,
      phone: "+10000000002",
      profile: {
        create: {
          bloodGroup: "O+",
          address: "123 Main St",
          city: "Springfield",
          country: "USA",
        },
      },
    },
  });

  return { admin, dispatcher, caller };
};

const seedHospitals = async () => {
  const hospitals = [
    {
      name: "Springfield General Hospital",
      phone: "+15555550100",
      email: "info@springfield-general.example",
      address: "1 Hospital Way",
      city: "Springfield",
      latitude: 40.7589,
      longitude: -73.9851,
    },
    {
      name: "Riverside Medical Center",
      phone: "+15555550101",
      email: "info@riverside-medical.example",
      address: "2 Riverside Dr",
      city: "Springfield",
      latitude: 40.7831,
      longitude: -73.9712,
    },
    {
      name: "Northern Heights Trauma Center",
      phone: "+15555550102",
      email: "info@northern-heights.example",
      address: "3 Northern Blvd",
      city: "Springfield",
      latitude: 40.8067,
      longitude: -73.9633,
    },
  ];

  for (const hospital of hospitals) {
    await prisma.hospital.upsert({
      where: { id: `seed-hospital-${hospital.phone}` },
      update: hospital,
      create: { id: `seed-hospital-${hospital.phone}`, ...hospital },
    });
  }
};

const seedAmbulances = async () => {
  const ambulances = [
    {
      id: "SEED-AMB-001",
      registrationNumber: "AMB-001",
      type: "ADVANCED_LIFE_SUPPORT" as const,
      capacity: 2,
      latitude: 40.7128,
      longitude: -74.006,
    },
    {
      id: "SEED-AMB-002",
      registrationNumber: "AMB-002",
      type: "BASIC_LIFE_SUPPORT" as const,
      capacity: 2,
      latitude: 40.7589,
      longitude: -73.9851,
    },
    {
      id: "SEED-AMB-003",
      registrationNumber: "AMB-003",
      type: "PATIENT_TRANSPORT" as const,
      capacity: 4,
      latitude: 40.7831,
      longitude: -73.9712,
    },
    {
      id: "SEED-AMB-004",
      registrationNumber: "AMB-004",
      type: "ADVANCED_LIFE_SUPPORT" as const,
      capacity: 2,
      latitude: 40.8067,
      longitude: -73.9633,
    },
  ];

  for (const ambulance of ambulances) {
    await prisma.ambulance.upsert({
      where: { registrationNumber: ambulance.registrationNumber },
      update: ambulance,
      create: ambulance,
    });
  }

  // Drivers
  const drivers = [
    {
      name: "John Carter",
      phone: "+15555550200",
      licenseNumber: "DL-1001",
      licenseExpiry: new Date("2030-12-31"),
      ambulanceId: "SEED-AMB-001",
    },
    {
      name: "Maria Lopez",
      phone: "+15555550201",
      licenseNumber: "DL-1002",
      licenseExpiry: new Date("2030-12-31"),
      ambulanceId: "SEED-AMB-002",
    },
    {
      name: "Akira Tanaka",
      phone: "+15555550202",
      licenseNumber: "DL-1003",
      licenseExpiry: new Date("2030-12-31"),
      ambulanceId: "SEED-AMB-003",
    },
    {
      name: "Priya Singh",
      phone: "+15555550203",
      licenseNumber: "DL-1004",
      licenseExpiry: new Date("2030-12-31"),
      ambulanceId: "SEED-AMB-004",
    },
  ];

  for (const driver of drivers) {
    await prisma.driver.upsert({
      where: { licenseNumber: driver.licenseNumber },
      update: driver,
      create: driver,
    });
  }
};

const main = async () => {
  console.log("Seeding database...");
  await seedUsers();
  await seedHospitals();
  await seedAmbulances();
  console.log("Seed complete.");
  console.log("\nDemo accounts (password: " + DEMO_PASSWORD + "):");
  console.log("  admin@ambulance.local   (ADMIN)");
  console.log("  dispatch@ambulance.local (DISPATCHER)");
  console.log("  caller@ambulance.local   (CALLER)");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });