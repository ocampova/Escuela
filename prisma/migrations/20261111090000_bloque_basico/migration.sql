-- CreateEnum
CREATE TYPE "PermissionAnswer" AS ENUM ('YES', 'NO');

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "permissionDeadline" DATE,
ADD COLUMN     "permissionQuestion" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "receiptNumber" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "photoConsent" BOOLEAN;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNotices" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailReceipts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "privacyAcceptedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AbsenceNotice" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsenceNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionResponse" (
    "announcementId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "answer" "PermissionAnswer" NOT NULL,
    "note" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionResponse_pkey" PRIMARY KEY ("announcementId","studentId")
);

-- CreateIndex
CREATE INDEX "AbsenceNotice_studentId_dateFrom_dateTo_idx" ON "AbsenceNotice"("studentId", "dateFrom", "dateTo");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- AddForeignKey
ALTER TABLE "AbsenceNotice" ADD CONSTRAINT "AbsenceNotice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceNotice" ADD CONSTRAINT "AbsenceNotice_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionResponse" ADD CONSTRAINT "PermissionResponse_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionResponse" ADD CONSTRAINT "PermissionResponse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionResponse" ADD CONSTRAINT "PermissionResponse_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

