import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { FAM_FREE_LIMIT, FAM_CREATION_COST, spendCoins } from "@/lib/fam";

export async function POST(request: Request) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : null;
    const icon = typeof body?.icon === "string" ? body.icon.trim() : null;

    if (!name || name.length > 60) {
      return NextResponse.json({ error: "Fam name is required (max 60 chars)" }, { status: 400 });
    }

    const ownedCount = await prisma.fam.count({ where: { ownerId: user.id } });
    const isFree = ownedCount < FAM_FREE_LIMIT;

    if (!isFree) {
      const spent = await spendCoins(user.id, FAM_CREATION_COST);
      if (!spent) {
        return NextResponse.json({ error: "Not enough coins to create another Fam" }, { status: 402 });
      }
    }

    const fam = await prisma.fam.create({
      data: {
        name,
        description,
        icon,
        ownerId: user.id,
        memberships: { create: { userId: user.id, role: "OWNER" } },
      },
    });

    return NextResponse.json({ success: true, fam, costPaid: isFree ? 0 : FAM_CREATION_COST });
  } catch (err) {
    console.error("Create fam error:", err);
    return NextResponse.json({ error: "Failed to create Fam" }, { status: 500 });
  }
}
