import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { requireRole, logActivity } from "@/lib/fam";

const ROLE_RANK = { OWNER: 0, ADMIN: 1, MEMBER: 2 } as const;

export async function POST(request: Request, { params }: { params: Promise<{ famId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { famId } = await params;

    const roleCheck = await requireRole(user.id, famId, ["OWNER", "ADMIN"]);
    if (roleCheck.error) return roleCheck.error;

    const body = await request.json();
    const targetUserId = typeof body?.userId === "string" ? body.userId : "";
    if (!targetUserId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    if (targetUserId === user.id) {
      return NextResponse.json({ error: "Use the leave endpoint to remove yourself" }, { status: 400 });
    }

    const target = await prisma.famMembership.findUnique({
      where: { userId_famId: { userId: targetUserId, famId } },
      include: { user: { select: { username: true, name: true } } },
    });
    if (!target) {
      return NextResponse.json({ error: "That user isn't a member" }, { status: 404 });
    }

    // Admins may only kick Members; Owner may kick anyone but themselves.
    if (ROLE_RANK[target.role] <= ROLE_RANK[roleCheck.membership.role]) {
      return NextResponse.json({ error: "Insufficient permissions to remove this member" }, { status: 403 });
    }

    await prisma.famMembership.delete({ where: { userId_famId: { userId: targetUserId, famId } } });

    const label = target.user.username ? `@${target.user.username}` : target.user.name || "A member";
    await logActivity(famId, "MEMBER_LEFT", `${label} was removed from the Fam`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Kick member error:", err);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
