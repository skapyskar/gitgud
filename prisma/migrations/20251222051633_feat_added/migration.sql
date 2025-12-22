-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('DAILY', 'WEEKLY', 'BACKLOG');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "isBonus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "repeatDays" TEXT,
ADD COLUMN     "scheduledDate" TIMESTAMP(3),
ADD COLUMN     "type" "TaskType" NOT NULL DEFAULT 'DAILY',
ADD COLUMN     "xpWorth" INTEGER NOT NULL DEFAULT 10;
