-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CALLER', 'DISPATCHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AmbulanceStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'EN_ROUTE', 'AT_SCENE', 'PATIENT_ONBOARD', 'AT_HOSPITAL', 'MAINTENANCE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "AmbulanceType" AS ENUM ('BASIC_LIFE_SUPPORT', 'ADVANCED_LIFE_SUPPORT', 'PATIENT_TRANSPORT', 'NEONATAL', 'AIR_AMBULANCE');

-- CreateEnum
CREATE TYPE "EmergencyType" AS ENUM ('CARDIAC', 'TRAUMA', 'RESPIRATORY', 'STROKE', 'OBSTETRIC', 'PEDIATRIC', 'BURN', 'POISONING', 'GENERAL_MEDICAL', 'ACCIDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "EmergencyPriority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "EmergencyStatus" AS ENUM ('PENDING', 'DISPATCHING', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'PICKED_UP', 'HOSPITAL_SELECTED', 'HOSPITAL_ARRIVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DispatchAssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EN_ROUTE', 'AT_SCENE', 'PATIENT_ONBOARD', 'AT_HOSPITAL', 'COMPLETED', 'CANCELLED', 'REASSIGNED');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('NOT_STARTED', 'EN_ROUTE', 'AT_SCENE', 'PATIENT_ONBOARD', 'AT_HOSPITAL', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE');

-- CreateTable
CREATE TABLE "ambulances" (
    "id" TEXT NOT NULL,
    "registrationNumber" VARCHAR(64) NOT NULL,
    "type" "AmbulanceType" NOT NULL DEFAULT 'BASIC_LIFE_SUPPORT',
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "status" "AmbulanceStatus" NOT NULL DEFAULT 'AVAILABLE',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ambulances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "licenseNumber" VARCHAR(64) NOT NULL,
    "licenseExpiry" TIMESTAMP(3) NOT NULL,
    "ambulanceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_assignments" (
    "id" TEXT NOT NULL,
    "emergencyRequestId" TEXT NOT NULL,
    "ambulanceId" TEXT NOT NULL,
    "dispatcherId" TEXT NOT NULL,
    "status" "DispatchAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_requests" (
    "id" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "emergencyType" "EmergencyType" NOT NULL,
    "priority" "EmergencyPriority" NOT NULL,
    "status" "EmergencyStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "locationAddress" VARCHAR(255),
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "contactPhone" VARCHAR(32),
    "contactName" VARCHAR(120),
    "cancelledReason" TEXT,
    "cancelledBy" VARCHAR(32),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_status_history" (
    "id" TEXT NOT NULL,
    "emergencyRequestId" TEXT NOT NULL,
    "fromStatus" "EmergencyStatus",
    "toStatus" "EmergencyStatus" NOT NULL,
    "changedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospitals" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(160),
    "address" TEXT NOT NULL,
    "city" VARCHAR(80),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "sessionId" TEXT,
    "transactionId" TEXT,
    "failureMessage" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "emergencyRequestId" TEXT NOT NULL,
    "ambulanceId" TEXT NOT NULL,
    "hospitalId" TEXT,
    "status" "TripStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "enRouteAt" TIMESTAMP(3),
    "atSceneAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "hospitalArrivedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "distance" DOUBLE PRECISION,
    "estimatedFare" DOUBLE PRECISION,
    "finalFare" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" VARCHAR(32),
    "profileImage" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CALLER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bloodGroup" VARCHAR(8),
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ambulances_registrationNumber_key" ON "ambulances"("registrationNumber");

-- CreateIndex
CREATE INDEX "ambulances_status_idx" ON "ambulances"("status");

-- CreateIndex
CREATE INDEX "ambulances_isActive_idx" ON "ambulances"("isActive");

-- CreateIndex
CREATE INDEX "ambulances_isDeleted_idx" ON "ambulances"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_licenseNumber_key" ON "drivers"("licenseNumber");

-- CreateIndex
CREATE INDEX "drivers_ambulanceId_idx" ON "drivers"("ambulanceId");

-- CreateIndex
CREATE INDEX "drivers_isActive_idx" ON "drivers"("isActive");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "dispatch_assignments_emergencyRequestId_idx" ON "dispatch_assignments"("emergencyRequestId");

-- CreateIndex
CREATE INDEX "dispatch_assignments_ambulanceId_idx" ON "dispatch_assignments"("ambulanceId");

-- CreateIndex
CREATE INDEX "dispatch_assignments_dispatcherId_idx" ON "dispatch_assignments"("dispatcherId");

-- CreateIndex
CREATE INDEX "dispatch_assignments_status_idx" ON "dispatch_assignments"("status");

-- CreateIndex
CREATE INDEX "emergency_requests_callerId_idx" ON "emergency_requests"("callerId");

-- CreateIndex
CREATE INDEX "emergency_requests_status_idx" ON "emergency_requests"("status");

-- CreateIndex
CREATE INDEX "emergency_requests_priority_idx" ON "emergency_requests"("priority");

-- CreateIndex
CREATE INDEX "emergency_requests_createdAt_idx" ON "emergency_requests"("createdAt");

-- CreateIndex
CREATE INDEX "emergency_requests_isDeleted_idx" ON "emergency_requests"("isDeleted");

-- CreateIndex
CREATE INDEX "emergency_status_history_emergencyRequestId_idx" ON "emergency_status_history"("emergencyRequestId");

-- CreateIndex
CREATE INDEX "emergency_status_history_createdAt_idx" ON "emergency_status_history"("createdAt");

-- CreateIndex
CREATE INDEX "hospitals_isActive_idx" ON "hospitals"("isActive");

-- CreateIndex
CREATE INDEX "hospitals_isDeleted_idx" ON "hospitals"("isDeleted");

-- CreateIndex
CREATE INDEX "hospitals_city_idx" ON "hospitals"("city");

-- CreateIndex
CREATE UNIQUE INDEX "payments_tripId_key" ON "payments"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_sessionId_key" ON "payments"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transactionId_key" ON "payments"("transactionId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_provider_idx" ON "payments"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "trips_emergencyRequestId_key" ON "trips"("emergencyRequestId");

-- CreateIndex
CREATE INDEX "trips_ambulanceId_idx" ON "trips"("ambulanceId");

-- CreateIndex
CREATE INDEX "trips_hospitalId_idx" ON "trips"("hospitalId");

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "trips"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_replacedById_key" ON "refresh_tokens"("replacedById");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "ambulances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_emergencyRequestId_fkey" FOREIGN KEY ("emergencyRequestId") REFERENCES "emergency_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "ambulances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_requests" ADD CONSTRAINT "emergency_requests_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_status_history" ADD CONSTRAINT "emergency_status_history_emergencyRequestId_fkey" FOREIGN KEY ("emergencyRequestId") REFERENCES "emergency_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_emergencyRequestId_fkey" FOREIGN KEY ("emergencyRequestId") REFERENCES "emergency_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "ambulances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
