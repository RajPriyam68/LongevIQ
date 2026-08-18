-- CreateTable
CREATE TABLE "PatientAccessGrant" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorPatient" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,

    CONSTRAINT "DoctorPatient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientAccessGrant_codeHash_key" ON "PatientAccessGrant"("codeHash");

-- CreateIndex
CREATE INDEX "PatientAccessGrant_patientId_idx" ON "PatientAccessGrant"("patientId");

-- CreateIndex
CREATE INDEX "PatientAccessGrant_expiresAt_idx" ON "PatientAccessGrant"("expiresAt");

-- CreateIndex
CREATE INDEX "DoctorPatient_doctorId_idx" ON "DoctorPatient"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorPatient_patientId_idx" ON "DoctorPatient"("patientId");

-- CreateIndex
CREATE INDEX "DoctorPatient_doctorId_patientId_revokedAt_idx" ON "DoctorPatient"("doctorId", "patientId", "revokedAt");

-- AddForeignKey
ALTER TABLE "PatientAccessGrant" ADD CONSTRAINT "PatientAccessGrant_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPatient" ADD CONSTRAINT "DoctorPatient_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPatient" ADD CONSTRAINT "DoctorPatient_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
