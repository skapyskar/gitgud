import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { getMembership, logActivity } from "@/lib/fam";

export async function POST(request: Request, { params }: { params: Promise<{ famId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { famId } = await params;

    const membership = await getMembership(user.id, famId);
    if (!membership) {
      return NextResponse.json({ error: "You're not a member of this Fam" }, { status: 404 });
    }
    if (membership.role === "OWNER") {
      return NextResponse.json(
        { error: "Transfer ownership or delete the Fam before leaving" },
        { status: 400 }
      );
    }

    await prisma.famMembership.delete({ where: { userId_famId: { userId: user.id, famId } } });

    const label = user.username ? `@${user.username}` : user.name || "A member";
    await logActivity(famId, "MEMBER_LEFT", `${label} left the Fam`, user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Leave fam error:", err);
    return NextResponse.json({ error: "Failed to leave Fam" }, { status: 500 });
  }
}
