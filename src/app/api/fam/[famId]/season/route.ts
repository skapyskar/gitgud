import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { getMembership, getOrCreateCurrentSeason, getFamSeasonScore } from "@/lib/fam";

export async function GET(request: Request, { params }: { params: Promise<{ famId: string }> }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;
    const { famId } = await params;

    const membership = await getMembership(user.id, famId);
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this Fam" }, { status: 403 });
    }

    const season = await getOrCreateCurrentSeason();
    const score = await getFamSeasonScore(famId, season.id);

    const pastSeasons = await prisma.famSeason.findMany({
      where: { id: { not: season.id } },
      orderBy: { startsAt: "desc" },
      take: 6,
    });
    const history = await Promise.all(
      pastSeasons.map(async (s) => ({
        id: s.id,
        label: s.label,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        score: await getFamSeasonScore(famId, s.id),
      }))
    );

    return NextResponse.json({ success: true, season, score, history });
  } catch (err) {
    console.error("Get season error:", err);
    return NextResponse.json({ error: "Failed to load season" }, { status: 500 });
  }
}
