-- CreateEnum
CREATE TYPE "FamActivityType" AS ENUM ('MEMBER_JOINED', 'MEMBER_LEFT', 'GOAL_PROPOSED', 'GOAL_ACTIVATED', 'GOAL_COMPLETED', 'ACHIEVEMENT_UNLOCKED');

-- CreateEnum
CREATE TYPE "FamGoalStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FamChallengeStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'DECLINED');

-- CreateTable
CREATE TABLE "FamGoal" (
    "id" TEXT NOT NULL,
    "famId" TEXT NOT NULL,
    "proposedById" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "status" "FamGoalStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "FamGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamGoalVote" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "approve" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamGoalVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamAchievement" (
    "id" TEXT NOT NULL,
    "famId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamActivity" (
    "id" TEXT NOT NULL,
    "famId" TEXT NOT NULL,
    "type" "FamActivityType" NOT NULL,
    "actorId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamChallenge" (
    "id" TEXT NOT NULL,
    "famId" TEXT NOT NULL,
    "opponentFamId" TEXT,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT,
    "metric" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "status" "FamChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "FamChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamSeason" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamDailyStat" (
    "id" TEXT NOT NULL,
    "famId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "activeMemberCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FamDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamGoal_famId_status_idx" ON "FamGoal"("famId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FamGoalVote_goalId_userId_key" ON "FamGoalVote"("goalId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FamAchievement_famId_key_key" ON "FamAchievement"("famId", "key");

-- CreateIndex
CREATE INDEX "FamActivity_famId_createdAt_idx" ON "FamActivity"("famId", "createdAt");

-- CreateIndex
CREATE INDEX "FamChallenge_famId_idx" ON "FamChallenge"("famId");

-- CreateIndex
CREATE UNIQUE INDEX "FamDailyStat_famId_date_key" ON "FamDailyStat"("famId", "date");

-- AddForeignKey
ALTER TABLE "FamGoal" ADD CONSTRAINT "FamGoal_famId_fkey" FOREIGN KEY ("famId") REFERENCES "Fam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamGoal" ADD CONSTRAINT "FamGoal_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamGoalVote" ADD CONSTRAINT "FamGoalVote_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "FamGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamGoalVote" ADD CONSTRAINT "FamGoalVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamAchievement" ADD CONSTRAINT "FamAchievement_famId_fkey" FOREIGN KEY ("famId") REFERENCES "Fam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamActivity" ADD CONSTRAINT "FamActivity_famId_fkey" FOREIGN KEY ("famId") REFERENCES "Fam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamActivity" ADD CONSTRAINT "FamActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamChallenge" ADD CONSTRAINT "FamChallenge_famId_fkey" FOREIGN KEY ("famId") REFERENCES "Fam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamChallenge" ADD CONSTRAINT "FamChallenge_opponentFamId_fkey" FOREIGN KEY ("opponentFamId") REFERENCES "Fam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamChallenge" ADD CONSTRAINT "FamChallenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamChallenge" ADD CONSTRAINT "FamChallenge_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamChallenge" ADD CONSTRAINT "FamChallenge_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamDailyStat" ADD CONSTRAINT "FamDailyStat_famId_fkey" FOREIGN KEY ("famId") REFERENCES "Fam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

