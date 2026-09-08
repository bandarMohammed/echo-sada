-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'THREAD_UPDATE';

-- CreateTable
CREATE TABLE "ClinicalThread" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "type" "InsightType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "recommendation" TEXT,
    "evidence" JSONB NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicalThread_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicalThread_patientId_status_idx" ON "ClinicalThread"("patientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalThread_patientId_fingerprint_key" ON "ClinicalThread"("patientId", "fingerprint");

-- AddForeignKey
ALTER TABLE "ClinicalThread" ADD CONSTRAINT "ClinicalThread_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
