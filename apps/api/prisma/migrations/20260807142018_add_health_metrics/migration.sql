-- CreateEnum
CREATE TYPE "HealthMetricType" AS ENUM ('BLOOD_PRESSURE', 'HEART_RATE', 'WEIGHT', 'BLOOD_GLUCOSE', 'BMI', 'SLEEP_HOURS', 'STEPS', 'BODY_TEMPERATURE');

-- CreateTable
CREATE TABLE "HealthMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "HealthMetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "valueSecondary" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthMetric_userId_type_recordedAt_idx" ON "HealthMetric"("userId", "type", "recordedAt");

-- AddForeignKey
ALTER TABLE "HealthMetric" ADD CONSTRAINT "HealthMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
