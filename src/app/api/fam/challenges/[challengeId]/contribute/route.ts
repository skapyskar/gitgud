import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { logActivity } from "@/lib/fam";
import { CHALLENGE_WIN_XP, CHALLENGE_WIN_COINS } from "@/lib/fam-constants";

export async function POST(request: Request, { params }: { params: Promise<{ challengeId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { challengeId } = await params;

    const body = await request.json();
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    const challenge = await prisma.famChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }
    if (challenge.status !== "ACTIVE") {
      return NextResponse.json({ error: "This challenge isn't active" }, { status: 400 });
    }

    const isChallenger = challenge.challengerId === user.id;
    const isOpponent = challenge.opponentId === user.id;
    if (!isChallenger && !isOpponent) {
      return NextResponse.json({ error: "You're not part of this challenge" }, { status: 403 });
    }

    const nextChallengerProgress = isChallenger
      ? Math.min(challenge.target, challenge.challengerProgress + amount)
      : challenge.challengerProgress;
    const nextOpponentProgress = isOpponent
      ? Math.min(challenge.target, challenge.opponentProgress + amount)
      : challenge.opponentProgress;

    const challengerWon = nextChallengerProgress >= challenge.target;
    const opponentWon = nextOpponentProgress >= challenge.target;
    const winnerId = challengerWon ? challenge.challengerId : opponentWon ? challenge.opponentId : null;

    // Guard on status so two concurrent contributions can't both cross the
    // finish line — only the request that actually flips ACTIVE -> COMPLETED
    // pays out the reward.
    const updated = await prisma.famChallenge.updateMany({
      where: { id: challengeId, status: "ACTIVE" },
      data: {
        challengerProgress: nextChallengerProgress,
        opponentProgress: nextOpponentProgress,
        status: winnerId ? "COMPLETED" : "ACTIVE",
        winnerId,
        resolvedAt: winnerId ? new Date() : null,
      },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "This challenge isn't active" }, { status: 409 });
    }

    if (winnerId) {
      const winner = await prisma.user.update({
        where: { id: winnerId },
        data: { coins: { increment: CHALLENGE_WIN_COINS }, xp: { increment: CHALLENGE_WIN_XP } },
        select: { username: true, name: true },
      });
      const label = winner.username ? `@${winner.username}` : winner.name || "A member";
      await logActivity(
        challenge.famId,
        "CHALLENGE_WON",
        `${label} won the challenge "${challenge.metric}" (+${CHALLENGE_WIN_XP} XP, +${CHALLENGE_WIN_COINS} coins)`
      );
    }

    return NextResponse.json({
      success: true,
      challengerProgress: nextChallengerProgress,
      opponentProgress: nextOpponentProgress,
      winnerId,
    });
  } catch (err) {
    console.error("Contribute to challenge error:", err);
    return NextResponse.json({ error: "Failed to contribute" }, { status: 500 });
  }
}
