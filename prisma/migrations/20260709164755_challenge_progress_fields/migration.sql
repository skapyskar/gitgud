-- DropForeignKey
ALTER TABLE "FamChallenge" DROP CONSTRAINT "FamChallenge_opponentFamId_fkey";

-- DropForeignKey
ALTER TABLE "FamChallenge" DROP CONSTRAINT "FamChallenge_opponentId_fkey";

-- AlterTable
ALTER TABLE "FamChallenge" DROP COLUMN "opponentFamId",
ADD COLUMN     "challengerProgress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "opponentProgress" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "opponentId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "FamChallenge" ADD CONSTRAINT "FamChallenge_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

