import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { requireRole, logActivity } from "@/lib/fam";

export async function GET(request: Request, { params }: { params: Promise<{ famId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { famId } = await params;

    const roleCheck = await requireRole(user.id, famId, ["OWNER", "ADMIN", "MEMBER"]);
    if (roleCheck.error) return roleCheck.error;

    const goals = await prisma.famGoal.findMany({
      where: { famId },
      include: {
        proposedBy: { select: { id: true, username: true, name: true } },
        votes: { select: { userId: true, approve: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, goals });
  } catch (err) {
    console.error("List goals error:", err);
    return NextResponse.json({ error: "Failed to load goals" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ famId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { famId } = await params;

    const roleCheck = await requireRole(user.id, famId, ["OWNER", "ADMIN", "MEMBER"]);
    if (roleCheck.error) return roleCheck.error;

    const body = await request.json();
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const targetValue = Number(body?.targetValue);

    if (!description || description.length > 160) {
      return NextResponse.json({ error: "Description required (max 160 chars)" }, { status: 400 });
    }
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      return NextResponse.json({ error: "targetValue must be a positive number" }, { status: 400 });
    }

    const goal = await prisma.famGoal.create({
      data: { famId, proposedById: user.id, description, targetValue },
    });

    await logActivity(famId, "GOAL_PROPOSED", `A goal was proposed: "${description}"`, user.id);

    return NextResponse.json({ success: true, goal });
  } catch (err) {
    console.error("Propose goal error:", err);
    return NextResponse.json({ error: "Failed to propose goal" }, { status: 500 });
  }
}
