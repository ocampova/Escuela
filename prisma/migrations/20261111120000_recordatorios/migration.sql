-- AlterTable
ALTER TABLE "School" ADD COLUMN     "remindersEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReminderLog_guardianId_kind_day_key" ON "ReminderLog"("guardianId", "kind", "day");

