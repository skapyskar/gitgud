-- AlterTable
ALTER TABLE "DayLog" ADD COLUMN     "possibleXP" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "allocatedDuration" INTEGER,
ADD COLUMN     "deadlineTime" TIMESTAMP(3),
ADD COLUMN     "durationMet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isExpired" BOOLEAN NOT NULL DEFAULT false;
