-- CreateEnum
CREATE TYPE "MedicationForm" AS ENUM ('PILL', 'CAPSULE', 'LIQUID', 'INHALER', 'INJECTION', 'CREAM', 'OINTMENT', 'DROPS', 'OTHER');

-- CreateEnum
CREATE TYPE "MedicationAdherenceStatus" AS ENUM ('PENDING', 'TAKEN', 'SKIPPED');

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "form" "MedicationForm" NOT NULL DEFAULT 'PILL',
    "reminderTimes" TEXT[],
    "instructions" TEXT,
    "notes" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationAdherence" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "MedicationAdherenceStatus" NOT NULL DEFAULT 'PENDING',
    "takenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationAdherence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Medication_userId_createdAt_idx" ON "Medication"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Medication_userId_active_idx" ON "Medication"("userId", "active");

-- CreateIndex
CREATE INDEX "MedicationAdherence_medicationId_date_idx" ON "MedicationAdherence"("medicationId", "date");

-- CreateIndex
CREATE INDEX "MedicationAdherence_date_idx" ON "MedicationAdherence"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationAdherence_medicationId_time_date_key" ON "MedicationAdherence"("medicationId", "time", "date");

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationAdherence" ADD CONSTRAINT "MedicationAdherence_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
