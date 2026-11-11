-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('INVITE', 'RESET');

-- CreateEnum
CREATE TYPE "ApplicantStatus" AS ENUM ('NEW', 'CONTACTED', 'VISIT', 'ACCEPTED', 'ENROLLED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Applicant" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "status" "ApplicantStatus" NOT NULL DEFAULT 'NEW',
    "gradeId" TEXT,
    "forYear" TEXT NOT NULL,
    "childFirstName" TEXT NOT NULL,
    "childLastName" TEXT NOT NULL,
    "childIdNumber" TEXT,
    "childBirthDate" DATE NOT NULL,
    "allergies" TEXT,
    "previousSchool" TEXT,
    "guardianName" TEXT NOT NULL,
    "guardianIdNumber" TEXT,
    "guardianEmail" TEXT NOT NULL,
    "guardianPhone" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "message" TEXT,
    "staffNotes" TEXT,
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicantDocument" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicantDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_studentId_key" ON "Applicant"("studentId");

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantDocument" ADD CONSTRAINT "ApplicantDocument_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
