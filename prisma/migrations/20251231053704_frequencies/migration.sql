-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "completedFrequency" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "frequency" INTEGER NOT NULL DEFAULT 1;
