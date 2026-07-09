import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { logActivity, checkAndUnlockAchievements } from "@/lib/fam";

export async function POST(request: Request) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const body = await request.json();
    const inviteId = typeof body?.inviteId === "string" ? body.inviteId : "";
    const action = body?.action === "accept" || body?.action === "decline" ? body.action : null;

    if (!inviteId || !action) {
      return NextResponse.json({ error: "inviteId and action are required" }, { status: 400 });
    }

    const invite = await prisma.famInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.status !== "PENDING") {
      return NextResponse.json({ error: "Invite not found or already resolved" }, { status: 404 });
    }

    // A targeted invite may only be resolved by its target; a link invite (invitedUserId
    // null) may be resolved by anyone holding it.
    if (invite.invitedUserId && invite.invitedUserId !== user.id) {
      return NextResponse.json({ error: "This invite isn't for you" }, { status: 403 });
    }

    if (invite.expiresAt < new Date()) {
      await prisma.famInvite.update({ where: { id: inviteId }, data: { status: "EXPIRED" } });
      return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
    }

    if (action === "decline") {
      await prisma.famInvite.update({ where: { id: inviteId }, data: { status: "DECLINED" } });
      return NextResponse.json({ success: true });
    }

    const alreadyMember = await prisma.famMembership.findUnique({
      where: { userId_famId: { userId: user.id, famId: invite.famId } },
    });
    if (alreadyMember) {
      await prisma.famInvite.update({ where: { id: inviteId }, data: { status: "ACCEPTED" } });
      return NextResponse.json({ success: true, alreadyMember: true });
    }

    await prisma.$transaction([
      prisma.famMembership.create({ data: { userId: user.id, famId: invite.famId, role: "MEMBER" } }),
      prisma.famInvite.update({ where: { id: inviteId }, data: { status: "ACCEPTED" } }),
    ]);

    const label = user.username ? `@${user.username}` : user.name || "A new member";
    await logActivity(invite.famId, "MEMBER_JOINED", `${label} joined the Fam`, user.id);
    await checkAndUnlockAchievements(invite.famId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Respond to invite error:", err);
    return NextResponse.json({ error: "Failed to respond to invite" }, { status: 500 });
  }
}
