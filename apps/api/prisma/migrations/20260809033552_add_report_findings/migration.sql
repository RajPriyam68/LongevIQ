-- CreateEnum
CREATE TYPE "ReportFindingFlag" AS ENUM ('NORMAL', 'HIGH', 'LOW');

-- AlterTable
ALTER TABLE "MedicalReport" ADD COLUMN     "parsedAt" TIMESTAMP(3),
ADD COLUMN     "parsedText" TEXT,
ADD COLUMN     "processingError" TEXT;

-- CreateTable
CREATE TABLE "ReportFinding" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "referenceRange" TEXT,
    "flag" "ReportFindingFlag",
    "confidence" DOUBLE PRECISION NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportFinding_reportId_idx" ON "ReportFinding"("reportId");

-- CreateIndex
CREATE INDEX "MedicalReport_status_idx" ON "MedicalReport"("status");

-- AddForeignKey
ALTER TABLE "ReportFinding" ADD CONSTRAINT "ReportFinding_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MedicalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
