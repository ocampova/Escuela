-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('CRC', 'USD');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'DEPOSIT';

-- AlterTable
ALTER TABLE "Applicant" ADD COLUMN     "checklist" TEXT[],
ADD COLUMN     "transfer" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Charge" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'CRC';

-- AlterTable
ALTER TABLE "FeeConcept" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'CRC',
ADD COLUMN     "dueNote" TEXT,
ADD COLUMN     "earlyAmount" INTEGER,
ADD COLUMN     "earlyMonths" INTEGER[],
ADD COLUMN     "levelId" TEXT;

-- AlterTable
ALTER TABLE "Level" ADD COLUMN     "address" TEXT,
ADD COLUMN     "materials" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "schedule" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'CRC';

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "bankAccountHolder" TEXT,
ADD COLUMN     "bankHolderId" TEXT,
ADD COLUMN     "bankIban" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "paymentNote" TEXT,
ADD COLUMN     "sinpePhone" TEXT;

-- CreateTable
CREATE TABLE "PaymentReport" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'CRC',
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "paidAt" DATE NOT NULL,
    "concept" TEXT NOT NULL,
    "note" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileData" BYTEA NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReport_paymentId_key" ON "PaymentReport"("paymentId");

-- AddForeignKey
ALTER TABLE "FeeConcept" ADD CONSTRAINT "FeeConcept_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReport" ADD CONSTRAINT "PaymentReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReport" ADD CONSTRAINT "PaymentReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReport" ADD CONSTRAINT "PaymentReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReport" ADD CONSTRAINT "PaymentReport_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
