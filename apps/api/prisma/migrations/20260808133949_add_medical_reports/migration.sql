-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PARSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('BLOODWORK', 'IMAGING', 'GENERAL', 'OTHER');

-- CreateTable
CREATE TABLE "MedicalReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "category" "ReportCategory" NOT NULL DEFAULT 'OTHER',
    "notes" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'UPLOADED',
    "fileName" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicalReport_storageKey_key" ON "MedicalReport"("storageKey");

-- CreateIndex
CREATE INDEX "MedicalReport_userId_createdAt_idx" ON "MedicalReport"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MedicalReport_userId_category_idx" ON "MedicalReport"("userId", "category");

-- AddForeignKey
ALTER TABLE "MedicalReport" ADD CONSTRAINT "MedicalReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
