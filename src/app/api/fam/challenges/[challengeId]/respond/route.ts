import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { logActivity } from "@/lib/fam";

export async function POST(request: Request, { params }: { params: Promise<{ challengeId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { challengeId } = await params;

    const body = await request.json();
    const action = body?.action === "accept" || body?.action === "decline" ? body.action : null;
    if (!action) {
      return NextResponse.json({ error: "action must be accept or decline" }, { status: 400 });
    }

    const challenge = await prisma.famChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.status !== "PENDING") {
      return NextResponse.json({ error: "Challenge not found or already resolved" }, { status: 404 });
    }
    if (challenge.opponentId !== user.id) {
      return NextResponse.json({ error: "Only the challenged member can respond" }, { status: 403 });
    }

    if (action === "decline") {
      await prisma.famChallenge.update({ where: { id: challengeId }, data: { status: "DECLINED" } });
      return NextResponse.json({ success: true });
    }

    await prisma.famChallenge.update({ where: { id: challengeId }, data: { status: "ACTIVE" } });
    await logActivity(challenge.famId, "CHALLENGE_STARTED", `A challenge began: "${challenge.metric}"`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Respond to challenge error:", err);
    return NextResponse.json({ error: "Failed to respond to challenge" }, { status: 500 });
  }
}
