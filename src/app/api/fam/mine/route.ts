import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";

export async function GET() {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const memberships = await prisma.famMembership.findMany({
      where: { userId: user.id },
      include: { fam: { include: { _count: { select: { memberships: true } } } } },
      orderBy: { joinedAt: "asc" },
    });

    const pendingInvites = await prisma.famInvite.findMany({
      where: { invitedUserId: user.id, status: "PENDING" },
      include: { fam: { select: { id: true, name: true, icon: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, memberships, pendingInvites });
  } catch (err) {
    console.error("List my fams error:", err);
    return NextResponse.json({ error: "Failed to load your Fams" }, { status: 500 });
  }
}
