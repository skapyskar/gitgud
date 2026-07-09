-- CreateEnum
CREATE TYPE "FamRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "FamInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateTable
CREATE TABLE "Fam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "ownerId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "famId" TEXT NOT NULL,
    "role" "FamRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamInvite" (
    "id" TEXT NOT NULL,
    "famId" TEXT NOT NULL,
    "invitedUserId" TEXT,
    "invitedUsername" TEXT,
    "invitedById" TEXT NOT NULL,
    "status" "FamInviteStatus" NOT NULL DEFAULT 'PENDING',
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Fam_ownerId_idx" ON "Fam"("ownerId");

-- CreateIndex
CREATE INDEX "FamMembership_famId_idx" ON "FamMembership"("famId");

-- CreateIndex
CREATE UNIQUE INDEX "FamMembership_userId_famId_key" ON "FamMembership"("userId", "famId");

-- CreateIndex
CREATE UNIQUE INDEX "FamInvite_code_key" ON "FamInvite"("code");

-- CreateIndex
CREATE INDEX "FamInvite_famId_idx" ON "FamInvite"("famId");

-- CreateIndex
CREATE INDEX "FamInvite_invitedUserId_idx" ON "FamInvite"("invitedUserId");

-- CreateIndex
CREATE INDEX "FamInvite_code_idx" ON "FamInvite"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Fam" ADD CONSTRAINT "Fam_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamMembership" ADD CONSTRAINT "FamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamMembership" ADD CONSTRAINT "FamMembership_famId_fkey" FOREIGN KEY ("famId") REFERENCES "Fam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamInvite" ADD CONSTRAINT "FamInvite_famId_fkey" FOREIGN KEY ("famId") REFERENCES "Fam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamInvite" ADD CONSTRAINT "FamInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

