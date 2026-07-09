import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { requireRole, DEFAULT_INVITE_EXPIRY_DAYS } from "@/lib/fam";
import { normalizeUsername } from "@/lib/username";

export async function POST(request: Request) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const body = await request.json();
    const famId = typeof body?.famId === "string" ? body.famId : "";
    const rawUsername = typeof body?.username === "string" ? body.username : "";

    if (!famId) {
      return NextResponse.json({ error: "famId required" }, { status: 400 });
    }

    const roleCheck = await requireRole(user.id, famId, ["OWNER", "ADMIN"]);
    if (roleCheck.error) return roleCheck.error;

    const expiresAt = new Date(Date.now() + DEFAULT_INVITE_EXPIRY_DAYS * 86_400_000);

    if (!rawUsername) {
      // Link-only invite — anyone with the code can accept it.
      const invite = await prisma.famInvite.create({
        data: { famId, invitedById: user.id, expiresAt },
      });
      return NextResponse.json({ success: true, invite });
    }

    const username = normalizeUsername(rawUsername);
    const invitedUser = await prisma.user.findUnique({ where: { username } });
    if (!invitedUser) {
      return NextResponse.json({ error: "No user with that username" }, { status: 404 });
    }

    const alreadyMember = await prisma.famMembership.findUnique({
      where: { userId_famId: { userId: invitedUser.id, famId } },
    });
    if (alreadyMember) {
      return NextResponse.json({ error: "That user is already in this Fam" }, { status: 400 });
    }

    const invite = await prisma.famInvite.create({
      data: {
        famId,
        invitedUserId: invitedUser.id,
        invitedUsername: invitedUser.username,
        invitedById: user.id,
        expiresAt,
      },
    });

    return NextResponse.json({ success: true, invite });
  } catch (err) {
    console.error("Invite fam error:", err);
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }
}
