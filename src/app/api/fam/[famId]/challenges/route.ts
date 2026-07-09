import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { getMembership } from "@/lib/fam";

export async function GET(request: Request, { params }: { params: Promise<{ famId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { famId } = await params;

    const membership = await getMembership(user.id, famId);
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this Fam" }, { status: 403 });
    }

    const challenges = await prisma.famChallenge.findMany({
      where: { famId },
      include: {
        challenger: { select: { id: true, username: true, name: true } },
        opponent: { select: { id: true, username: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, challenges });
  } catch (err) {
    console.error("List challenges error:", err);
    return NextResponse.json({ error: "Failed to load challenges" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ famId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { famId } = await params;

    const membership = await getMembership(user.id, famId);
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this Fam" }, { status: 403 });
    }

    const body = await request.json();
    const opponentId = typeof body?.opponentId === "string" ? body.opponentId : "";
    const metric = typeof body?.metric === "string" ? body.metric.trim() : "";
    const target = Number(body?.target);

    if (!opponentId || opponentId === user.id) {
      return NextResponse.json({ error: "A different opponent is required" }, { status: 400 });
    }
    if (!metric || metric.length > 60) {
      return NextResponse.json({ error: "metric required (max 60 chars)" }, { status: 400 });
    }
    if (!Number.isFinite(target) || target <= 0) {
      return NextResponse.json({ error: "target must be a positive number" }, { status: 400 });
    }

    const opponentMembership = await getMembership(opponentId, famId);
    if (!opponentMembership) {
      return NextResponse.json({ error: "Opponent isn't a member of this Fam" }, { status: 400 });
    }

    const challenge = await prisma.famChallenge.create({
      data: { famId, challengerId: user.id, opponentId, metric, target },
    });

    return NextResponse.json({ success: true, challenge });
  } catch (err) {
    console.error("Propose challenge error:", err);
    return NextResponse.json({ error: "Failed to propose challenge" }, { status: 500 });
  }
}
