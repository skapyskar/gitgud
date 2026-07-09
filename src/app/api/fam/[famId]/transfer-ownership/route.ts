import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { requireRole } from "@/lib/fam";

export async function POST(request: Request, { params }: { params: Promise<{ famId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { famId } = await params;

    const roleCheck = await requireRole(user.id, famId, ["OWNER"]);
    if (roleCheck.error) return roleCheck.error;

    const body = await request.json();
    const newOwnerId = typeof body?.newOwnerId === "string" ? body.newOwnerId : "";
    if (!newOwnerId || newOwnerId === user.id) {
      return NextResponse.json({ error: "newOwnerId (a different member) required" }, { status: 400 });
    }

    const newOwnerMembership = await prisma.famMembership.findUnique({
      where: { userId_famId: { userId: newOwnerId, famId } },
    });
    if (!newOwnerMembership) {
      return NextResponse.json({ error: "That user isn't a member of this Fam" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.fam.update({ where: { id: famId }, data: { ownerId: newOwnerId } }),
      prisma.famMembership.update({
        where: { userId_famId: { userId: newOwnerId, famId } },
        data: { role: "OWNER" },
      }),
      prisma.famMembership.update({
        where: { userId_famId: { userId: user.id, famId } },
        data: { role: "ADMIN" },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Transfer ownership error:", err);
    return NextResponse.json({ error: "Failed to transfer ownership" }, { status: 500 });
  }
}
