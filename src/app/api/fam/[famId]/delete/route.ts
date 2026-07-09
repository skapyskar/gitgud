import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { requireRole } from "@/lib/fam";

export async function DELETE(request: Request, { params }: { params: Promise<{ famId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { famId } = await params;

    const roleCheck = await requireRole(user.id, famId, ["OWNER"]);
    if (roleCheck.error) return roleCheck.error;

    // FamMembership/FamInvite cascade-delete via the schema's onDelete: Cascade.
    await prisma.fam.delete({ where: { id: famId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete fam error:", err);
    return NextResponse.json({ error: "Failed to delete Fam" }, { status: 500 });
  }
}
