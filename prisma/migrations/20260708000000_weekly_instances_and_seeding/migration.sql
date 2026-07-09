-- Add link from spawned DAILY instances back to their WEEKLY template
ALTER TABLE "Task" ADD COLUMN "templateId" TEXT;

-- Track whether a day's possibleXP already includes active weekly templates
ALTER TABLE "DayLog" ADD COLUMN "weeklySeeded" BOOLEAN NOT NULL DEFAULT false;

-- Index for "instance of template X on day Y" lookups
CREATE INDEX "Task_templateId_scheduledDate_idx" ON "Task"("templateId", "scheduledDate");
