-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "adaptation" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "adaptationNote" TEXT,
ADD COLUMN     "enrolledOn" DATE,
ADD COLUMN     "exitDate" DATE,
ADD COLUMN     "exitReason" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "repeating" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sex" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

