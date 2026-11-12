-- DropForeignKey
ALTER TABLE "PickupLog" DROP CONSTRAINT "PickupLog_staffId_fkey";

-- DropForeignKey
ALTER TABLE "PickupLog" DROP CONSTRAINT "PickupLog_studentId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "locale";

-- DropTable
DROP TABLE "PickupLog";

